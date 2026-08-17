package fr.nogafam.lifecounter.player;

import android.view.View;
import android.widget.TextView;

public class PlayerViews {

  private final TextView historyView;

  private final TextView lifePointsView;

  private final View playerLayout;


  public PlayerViews(TextView historyView, TextView lifePointsView, View playerLayout) {
    this.historyView = historyView;
    this.lifePointsView = lifePointsView;
    this.playerLayout = playerLayout;
  }

  public TextView getHistoryView() {
    return historyView;
  }

  public TextView getLifePointsView() {
    return lifePointsView;
  }

  public View getPlayerLayout() {
    return playerLayout;
  }

  public void refreshLifePoints(int lifePoints) {
    lifePointsView.setText(String.valueOf(lifePoints));
  }

  public void resetHistoryView() {
    historyView.setText("");
  }

  public void reset() {
    lifePointsView.setText("20");
  }
}
