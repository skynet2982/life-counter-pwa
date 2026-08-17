package fr.nogafam.lifecounter.timer;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.widget.TextView;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

public class TimerView {

  private final AtomicBoolean displayed = new AtomicBoolean(false);
  private final TextView timerView;

  public TimerView(TextView timerView) {
    this.timerView = timerView;
  }

  public void addBorderIfNeeded() {
    if (!timerView.getText().toString().isEmpty()) {
      GradientDrawable border = new GradientDrawable();
      border.setColor(Color.BLACK);
      border.setStroke(2, Color.WHITE);
      timerView.setBackground(border);
      timerView.setPadding(8, 8, 8, 8);

    } else {
      GradientDrawable border = new GradientDrawable();
      border.setColor(Color.BLACK);
      border.setStroke(2, Color.BLACK);

      timerView.setBackground(border);
      timerView.setPadding(8, 8, 8, 8);
    }
  }

  public void refresh(long time) {
    timerView.setText(toDisplayTime(time));
    addBorderIfNeeded();
  }

  public void reset() {
    timerView.setText("");
    addBorderIfNeeded();
  }

  private String toDisplayTime(long longTime) {
    int minutes = (int) (longTime / 1000) / 60;
    int seconds = (int) (longTime / 1000) % 60;
    return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
  }

  public TextView getTimerView() {
    return timerView;
  }

  public boolean isDisplayed() {
    return displayed.get();
  }

  public void display() {
    displayed.set(true);
  }

  public void hide() {
    displayed.set(false);
  }
}
