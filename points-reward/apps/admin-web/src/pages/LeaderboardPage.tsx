import { Trophy } from "lucide-react";
import type { LeaderboardRow } from "../types";

export function LeaderboardPage({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="panel">
      <div className="panel-actions">
        <div className="panel-title">
          <Trophy size={18} />
          <span>Total Point Leaderboard</span>
          <strong>{rows.length}</strong>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Address</th>
              <th>Total Point</th>
              <th>Current Point</th>
              <th>Total Special</th>
              <th>Current Special</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.rank}-${row.address}`}>
                <td>{row.rank}</td>
                <td className="mono">{row.address}</td>
                <td>{row.totalPoint}</td>
                <td>{row.currentPoint}</td>
                <td>{row.totalSpecialPoint}</td>
                <td>{row.currentSpecialPoint}</td>
                <td>{row.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
