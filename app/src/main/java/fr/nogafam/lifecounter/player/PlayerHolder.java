package fr.nogafam.lifecounter.player;

public class PlayerHolder {

  private final Player player;
  private final PlayerViews playerViews;


  public PlayerHolder(Player player, PlayerViews playerViews) {
    this.player = player;
    this.playerViews = playerViews;
  }

  public Player getPlayer() {
    return player;
  }

  public PlayerViews getPlayerViews() {
    return playerViews;
  }

  public void reset() {
    player.reset();
    playerViews.reset();
  }
}
