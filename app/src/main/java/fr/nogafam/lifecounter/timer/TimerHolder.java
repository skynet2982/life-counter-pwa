package fr.nogafam.lifecounter.timer;

import android.os.CountDownTimer;

public class TimerHolder {

  public static final int ONE_SECOND_IN_MILLI = 1000;
  private final TimerView timerView;
  private final Timer timer;
  private CountDownTimer countDownTimer;

  public TimerHolder(Timer timer, TimerView timerView) {
    this.timerView = timerView;
    this.timer = timer;
  }

  public void reset() {
    stop();
    timer.reset();
    timerView.reset();
    timerView.hide();
    countDownTimer = null;
  }

  public void refresh() {
    timerView.refresh(timer.getCurrentTime());
  }

  private CountDownTimer createCountDownTimer() {
    CountDownTimer countDownTimer = new CountDownTimer(timer.getCurrentTime(),
        ONE_SECOND_IN_MILLI) {
      @Override
      public void onTick(long millisUntilFinished) {
        timer.setCurrentTime(millisUntilFinished);
        timerView.refresh(timer.getCurrentTime());
      }

      @Override
      public void onFinish() {
        timer.setCurrentTime(0);
        timerView.refresh(timer.getCurrentTime());
      }
    };
    return countDownTimer;
  }

  public void start() {
    timer.start();
    countDownTimer = createCountDownTimer();
    countDownTimer.start();
  }

  public void stop() {
    timer.stop();
    if (null != countDownTimer) {
      countDownTimer.cancel();
    }
  }

  public TimerView getTimerView() {
    return timerView;
  }

  public Timer getTimer() {
    return timer;
  }
}
