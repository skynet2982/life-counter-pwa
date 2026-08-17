package fr.nogafam.lifecounter.timer;

public class Timer {

  private static final long DEFAULT_VALUE = 50 * 60 * 1000;
  private boolean running;
  private long currentTime;

  public Timer() {
    currentTime = DEFAULT_VALUE;
  }

  public boolean isRunning() {
    return running;
  }

  public void stop() {
    running = false;
  }

  public void start() {
    running = true;
  }

  public long getCurrentTime() {
    return currentTime;
  }

  public void setCurrentTime(long currentTime) {
    this.currentTime = currentTime;
  }

  public void reset() {
    currentTime = DEFAULT_VALUE;
  }

  public long getDefaultTime() {
    return DEFAULT_VALUE;
  }
}
