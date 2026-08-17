package fr.nogafam.lifecounter.player;

public class HistoryEntry {

  private long timestamp;

  private int value;

  public HistoryEntry(long timestamp, int value) {
    this.timestamp = timestamp;
    this.value = value;
  }

  public long getTimestamp() {
    return timestamp;
  }

  public int getValue() {
    return value;
  }
}
