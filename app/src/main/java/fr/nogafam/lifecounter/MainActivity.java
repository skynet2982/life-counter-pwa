package fr.nogafam.lifecounter;

import android.content.DialogInterface;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.text.method.DigitsKeyListener;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.inputmethod.BaseInputConnection;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import fr.nogafam.lifecounter.player.HistoryEntry;
import fr.nogafam.lifecounter.player.Player;
import fr.nogafam.lifecounter.player.PlayerHolder;
import fr.nogafam.lifecounter.player.PlayerViews;
import fr.nogafam.lifecounter.timer.TimerHolder;
import fr.nogafam.lifecounter.R;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class MainActivity extends AppCompatActivity {

  private static final int INACTIVITY_TIMEOUT = 1000;
  private static final float SWIPE_THRESHOLD = 100;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private Game game;
  private PlayerHolder playerHolderToCheckForTimeout;
  private Runnable historyUpdater;
  private float startY;

  private static void addToHistory(PlayerHolder playerHolder) {
    Player player = playerHolder.getPlayer();
    TextView historyTextView = playerHolder.getPlayerViews().getHistoryView();
    String currentHistory = historyTextView.getText().toString();
    String[] historyLines = currentHistory.split("\n");

    if (player.getCurrentLifePoints() != player.getPreviousLifePoints()) {
      if (historyLines.length > 0 && !historyLines[historyLines.length - 1].equals(
          String.valueOf(player.getCurrentLifePoints()))) {
        currentHistory += player.getCurrentLifePoints() + "\n";
        player.addHistoryEntry(System.currentTimeMillis(), player.getCurrentLifePoints());
        historyTextView.setText(currentHistory);
        player.setPreviousLifePoints(player.getCurrentLifePoints());
      }
    }
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    supportRequestWindowFeature(Window.FEATURE_NO_TITLE);
    setContentView(R.layout.activity_main);
    game = Game.createNewGame(this);

    // Refresh all views to display default values
    refreshViews();

    // Handle LifeCount touch
    game.getPlayerHolderMap().values().forEach(playerHolder -> {
      PlayerViews playerViews = playerHolder.getPlayerViews();
      playerViews.getPlayerLayout().setOnTouchListener((v, e) -> {
        handlePlayerLifeCountTouch(playerHolder, e);
        return true;
      });
    });

    // Handle History touch
    game.getPlayerHolderMap().values().forEach(playerHolder -> {
      PlayerViews playerViews = playerHolder.getPlayerViews();
      playerViews.getHistoryView().setOnLongClickListener(v -> {
        showHistoryEntriesDialog(playerHolder);
        return true;
      });
    });

    startHistoryUpdater();

    // Timer view touch
    game.getTimerHolder().getTimerView().getTimerView().setOnClickListener((v) -> {
      if (game.getTimerHolder().getTimer().isRunning()) {
        game.getTimerHolder().stop();
      } else {
        game.getTimerHolder().start();
      }
    });

    game.getTimerHolder().getTimerView().getTimerView().setOnLongClickListener(v -> {
      showTimerInputDialog(game.getTimerHolder());
      return true;
    });

  }

  private void showTimerInputDialog(TimerHolder timerHolder) {
    AlertDialog.Builder builder = new AlertDialog.Builder(this);
    builder.setTitle("Set Timer Value");

    final EditText input = new EditText(this);
    input.setInputType(InputType.TYPE_CLASS_NUMBER);
    input.setRawInputType(Configuration.KEYBOARD_12KEY);
    input.setKeyListener(DigitsKeyListener.getInstance("0123456789"));
    builder.setView(input);

    builder.setPositiveButton("OK", (dialog, which) -> {
      String inputValue = input.getText().toString();
      timerHolder.getTimer().setCurrentTime(Long.parseLong(inputValue) * 1000 * 60);
      timerHolder.refresh();
    });

    builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());

    builder.show();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);

    if (hasFocus) {
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
        getWindow().getDecorView().getWindowInsetsController()
            .hide(android.view.WindowInsets.Type.statusBars());
      } else {
        getWindow().setFlags(android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN,
            android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN);
      }
    }
  }

  private void showHistoryEntriesDialog(PlayerHolder player) {

    List<String> entriesList = new ArrayList<>();
    List<HistoryEntry> historyEntries = player.getPlayer().getHistoryEntries();
    for (HistoryEntry historyEntry : historyEntries) {
      String builder = "Life Points : " + historyEntry.getValue() + " at " + formatDate(
          historyEntry.getTimestamp());
      entriesList.add(builder);
    }

    ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_list_item_1,
        entriesList);

    AlertDialog.Builder builder = new AlertDialog.Builder(this);
    builder.setTitle("History");
    builder.setAdapter(adapter, null);
    builder.setPositiveButton("Close", (dialog, which) -> dialog.dismiss());
    builder.show();

  }

  private void showResetConfirmationDialog() {
    AlertDialog.Builder builder = new AlertDialog.Builder(this);
    builder.setTitle("Confirmation");
    builder.setMessage("Are you sure you want to reset the game ?");
    builder.setPositiveButton("Yes", (dialog, which) -> {
      game.reset();
      dialog.dismiss();
    });
    builder.setNegativeButton("No", (dialog, which) -> dialog.dismiss());
    builder.show();
  }

  private String formatDate(long timestamp) {
    SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
    return sdf.format(new Date(timestamp));
  }

  private void refreshViews() {
    game.refreshPlayerView();
    game.refreshDifferenceView();
  }

  private void handlePlayerLifeCountTouch(PlayerHolder playerHolder, MotionEvent event) {
    if (!game.getTimerHolder().getTimer().isRunning() && game.getTimerHolder().getTimerView()
        .isDisplayed()) {
      game.getTimerHolder().start();
    }

    long currentTimestamp = System.currentTimeMillis();
    Player player = playerHolder.getPlayer();
    TextView textView = playerHolder.getPlayerViews().getLifePointsView();

    switch (event.getAction()) {
      case MotionEvent.ACTION_DOWN:
        if (null != playerHolderToCheckForTimeout
            && playerHolderToCheckForTimeout != playerHolder) {
          addToHistory(playerHolderToCheckForTimeout);
          resetDifference();
        }
        playerHolderToCheckForTimeout = playerHolder;

        startY = event.getY();
        break;
      case MotionEvent.ACTION_UP:
        float endY = event.getY();
        float deltaY = startY - endY;

        if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
          if (deltaY > SWIPE_THRESHOLD) {
            player.incrementLifePoints(5);
            game.incrementDifference(5);
          } else if (deltaY < -SWIPE_THRESHOLD) {
            player.decrementLifePoints(5);
            game.decrementDifference(5);
          }
          refreshViews();
        } else {
          if (event.getY() < textView.getHeight() / 2) {
            player.incrementLifePoints(1);
            game.incrementDifference(1);
          } else {
            player.decrementLifePoints(1);
            game.decrementDifference(1);
          }
          refreshViews();
        }
        player.setLastTouchTimestampPlayer(currentTimestamp);
        break;
    }
  }


  private void resetDifference() {
    game.resetDifference();
    game.refreshDifferenceView();
  }

  private void startHistoryUpdater() {
    historyUpdater = new Runnable() {
      @Override
      public void run() {
        if (null != playerHolderToCheckForTimeout) {
          long currentTime = System.currentTimeMillis();
          Player player = playerHolderToCheckForTimeout.getPlayer();
          if (currentTime - player.getLastTouchTimestampPlayer() >= INACTIVITY_TIMEOUT) {
            addToHistory(playerHolderToCheckForTimeout);
            resetDifference();
          }
        }
        handler.postDelayed(this, INACTIVITY_TIMEOUT);
      }

    };
    handler.post(historyUpdater);
  }

  @Override
  public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.main_menu, menu);
    return true;
  }

  @Override
  public boolean onOptionsItemSelected(MenuItem item) {
    int id = item.getItemId();

    if (id == R.id.resetGameButton) {
      showResetConfirmationDialog();
      return true;
    } else if (id == R.id.timerButton) {
      showTimer();
      return true;
    } else if (id == R.id.resetLifePointsButton) {
      game.resetGameKeepTimer();
    }

    return super.onOptionsItemSelected(item);
  }

  private void showTimer() {
    if (game.getTimerHolder().getTimerView().isDisplayed()) {
      game.getTimerHolder().reset();
    } else {
      game.getTimerHolder().getTimerView().display();
      game.refreshTimerView();
    }

  }

  public void onMenuButtonClick(View view) {
    openOptionsMenu();
  }

  @Override
  public void openOptionsMenu() {
    View v = this.getWindow().getDecorView().getRootView();
    BaseInputConnection mInputConnection = new BaseInputConnection(v, true);
    KeyEvent kd = new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MENU);
    KeyEvent ku = new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MENU);
    mInputConnection.sendKeyEvent(kd);
    mInputConnection.sendKeyEvent(ku);
  }


}
