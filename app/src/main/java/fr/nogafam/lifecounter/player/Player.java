package fr.nogafam.lifecounter.player;

import java.util.ArrayList;
import java.util.List;

public class Player {

  private final List<HistoryEntry> historyEntries = new ArrayList<>();
  private int currentLifePoints = 20;
  private int previousLifePoints = 20;
  private long lastTouchTimestampPlayer;

  public Player() {
    this.lastTouchTimestampPlayer = System.currentTimeMillis();
  }

  public int getCurrentLifePoints() {
    return currentLifePoints;
  }

  public int getPreviousLifePoints() {
    return previousLifePoints;
  }

  public void setPreviousLifePoints(int previousLifePoints) {
    this.previousLifePoints = previousLifePoints;
  }

  public long getLastTouchTimestampPlayer() {
    return lastTouchTimestampPlayer;
  }

  public void setLastTouchTimestampPlayer(long lastTouchTimestampPlayer) {
    this.lastTouchTimestampPlayer = lastTouchTimestampPlayer;
  }

  public void incrementLifePoints(int i) {
    currentLifePoints += i;
  }

  public void decrementLifePoints(int i) {
    currentLifePoints -= i;
  }

  public void addHistoryEntry(long timestamp, int value) {
    historyEntries.add(new HistoryEntry(timestamp, value));
  }

  public List<HistoryEntry> getHistoryEntries() {
    return historyEntries;
  }

  public void reset() {
    historyEntries.clear();
    currentLifePoints = 20;
    previousLifePoints = 20;
  }
}
