package fr.nogafam.lifecounter;

import static fr.nogafam.lifecounter.Game.PlayerName.PLAYER1;
import static fr.nogafam.lifecounter.Game.PlayerName.PLAYER2;

import android.graphics.Color;
import android.widget.TextView;
import fr.nogafam.lifecounter.player.Player;
import fr.nogafam.lifecounter.player.PlayerHolder;
import fr.nogafam.lifecounter.player.PlayerViews;
import fr.nogafam.lifecounter.timer.Timer;
import fr.nogafam.lifecounter.timer.TimerHolder;
import fr.nogafam.lifecounter.timer.TimerView;
import fr.nogafam.lifecounter.R;
import java.util.HashMap;
import java.util.Map;

public class Game {

  private final Map<PlayerName, PlayerHolder> playerHolderMap;
  private final TimerHolder timerHolder;
  private final TextView differenceTextView;

  private int difference = 0;

  private Game(Map<PlayerName, PlayerHolder> playerHolderMap, TextView differenceTextView,
      TimerHolder timerHolder) {
    this.playerHolderMap = playerHolderMap;
    this.differenceTextView = differenceTextView;
    this.timerHolder = timerHolder;
  }

  public static Game createNewGame(MainActivity mainActivity) {
    /////////////
    // PLAYERS //
    /////////////
    Map<PlayerName, PlayerHolder> playerViewsHolderMap = new HashMap<>();
    // Player 1
    PlayerViews player1Views = new PlayerViews(
        mainActivity.findViewById(R.id.player1HistoryTextView),
        mainActivity.findViewById(R.id.player1Points),
        mainActivity.findViewById(R.id.player1Layout));
    playerViewsHolderMap.put(PLAYER1, new PlayerHolder(new Player(), player1Views));
    // Player 2
    PlayerViews player2Views = new PlayerViews(
        mainActivity.findViewById(R.id.player2HistoryTextView),
        mainActivity.findViewById(R.id.player2Points),
        mainActivity.findViewById(R.id.player2Layout));
    playerViewsHolderMap.put(PLAYER2, new PlayerHolder(new Player(), player2Views));
    ///////////
    // Timer //
    ///////////
    TextView timerView = mainActivity.findViewById(R.id.timerTextView);
    TimerHolder timerHolderMap = new TimerHolder(new Timer(), new TimerView(timerView));

    return new Game(playerViewsHolderMap, mainActivity.findViewById(R.id.differenceTextView),
        timerHolderMap);
  }


  public void refreshPlayerView() {
    playerHolderMap.forEach((playerName, playerHolder) -> playerHolder.getPlayerViews()
        .refreshLifePoints(playerHolder.getPlayer().getCurrentLifePoints()));
  }

  public void refreshDifferenceView() {
    if (difference == 0) {
      differenceTextView.setText("");
      differenceTextView.setTextColor(Color.WHITE);
    } else if (difference > 0) {
      differenceTextView.setText("+" + difference);
      differenceTextView.setTextColor(Color.GREEN);
    } else {
      differenceTextView.setText(String.valueOf(difference));
      differenceTextView.setTextColor(Color.RED);
    }
  }


  public TimerHolder getTimerHolder() {
    return timerHolder;
  }

  public void reset() {
    resetGameKeepTimer();
    timerHolder.reset();
  }

  public void resetGameKeepTimer() {
    // Reset
    resetLifePointViews();
    resetHistoryViews();
    resetDifference();
    // Refresh
    refreshPlayerView();
    refreshDifferenceView();
  }

  private void resetLifePointViews() {
    playerHolderMap.forEach((playerName, playerHolder) -> playerHolder.reset());
  }

  private void resetHistoryViews() {
    playerHolderMap.forEach(
        (playerName, playerHolder) -> playerHolder.getPlayerViews().resetHistoryView());
  }

  public void resetDifference() {
    difference = 0;
  }

  public Map<PlayerName, PlayerHolder> getPlayerHolderMap() {
    return playerHolderMap;
  }

  public void incrementDifference(int i) {
    difference+=i;
  }

  public void decrementDifference(int i) {
    difference-=i;
  }

  public void refreshTimerView() {
    timerHolder.refresh();
  }

  enum PlayerName {
    PLAYER1, PLAYER2
  }

}
