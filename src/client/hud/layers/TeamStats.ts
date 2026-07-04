import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { GameMode, Team, UnitType } from "../../../core/game/Game";
import { Controller } from "../../Controller";
import {
  formatPercentage,
  renderNumber,
  renderTroops,
  translateText,
} from "../../Utils";
import { GameView, PlayerView } from "../../view";

interface TeamEntry {
  teamName: string;
  isMyTeam: boolean;
  totalScoreStr: string;
  totalGold: string;
  totalMaxTroops: string;
  totalSAMs: string;
  totalLaunchers: string;
  totalWarShips: string;
  totalCities: string;
  totalScoreSort: number;
  players: PlayerView[];
}

@customElement("team-stats")
export class TeamStats extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;

  @property({ type: Boolean }) visible = false;
  teams: TeamEntry[] = [];
  private _shownOnInit = false;
  private showUnits = false;
  private _myTeam: Team | null = null;

  createRenderRoot() {
    return this; // use light DOM for Tailwind
  }

  init() {}

  getTickIntervalMs() {
    return 1000;
  }

  tick() {
    if (this.game.config().gameConfig().gameMode !== GameMode.Team) return;

    if (!this._shownOnInit && !this.game.inSpawnPhase()) {
      this._shownOnInit = true;
      this.updateTeamStats();
    }

    if (!this.visible) return;

    this.updateTeamStats();
  }

  private updateTeamStats() {
    const players = this.game.playerViews();
    const grouped: Record<Team, PlayerView[]> = {};

    if (this._myTeam === null) {
      const myPlayer = this.game.myPlayer();
      this._myTeam = myPlayer?.team() ?? null;
    }

    for (const player of players) {
      const rawTeam = player.team();
      if (rawTeam === null) continue;
      grouped[rawTeam] ??= [];
      grouped[rawTeam].push(player);
    }

    this.teams = Object.entries(grouped)
      .map(([rawTeam, teamPlayers]) => {
        const key = `team_colors.${rawTeam.toLowerCase()}`;
        const translated = translateText(key);
        const teamName = translated !== key ? translated : rawTeam;

        let totalGold = 0n;
        let totalMaxTroops = 0;
        let totalScoreSort = 0;
        let totalSAMs = 0;
        let totalLaunchers = 0;
        let totalWarShips = 0;
        let totalCities = 0;

        for (const p of teamPlayers) {
          if (p.isAlive()) {
            totalMaxTroops += this.game.config().maxTroops(p);
            totalGold += p.gold();
            totalScoreSort += p.numTilesOwned();
            totalLaunchers += p.totalUnitLevels(UnitType.MissileSilo);
            totalSAMs += p.totalUnitLevels(UnitType.SAMLauncher);
            totalWarShips += p.totalUnitLevels(UnitType.Warship);
            totalCities += p.totalUnitLevels(UnitType.City);
          }
        }

        const numTilesWithoutFallout =
          this.game.numLandTiles() - this.game.numTilesWithFallout();
        const totalScorePercent = totalScoreSort / numTilesWithoutFallout;

        return {
          teamName,
          isMyTeam: rawTeam === this._myTeam,
          totalScoreStr: formatPercentage(totalScorePercent),
          totalScoreSort,
          totalGold: renderNumber(totalGold),
          totalMaxTroops: renderTroops(totalMaxTroops),
          players: teamPlayers,

          totalLaunchers: renderNumber(totalLaunchers),
          totalSAMs: renderNumber(totalSAMs),
          totalWarShips: renderNumber(totalWarShips),
          totalCities: renderNumber(totalCities),
        };
      })
      .sort((a, b) => b.totalScoreSort - a.totalScoreSort);

    this.requestUpdate();
  }

  render() {
    if (!this.visible) return html``;

    return html`
      <div
        class="max-h-[30vh] overflow-x-hidden overflow-y-auto grid bg-[#101a22]/92 w-full text-[#e8f1f2] text-xs md:text-sm mt-2 rounded-md ring-1 ring-[#57bfd7]/20"
        @contextmenu=${(e: MouseEvent) => e.preventDefault()}
      >
        <div
          class="grid w-full grid-cols-[repeat(var(--cols),1fr)]"
          style="--cols:${this.showUnits ? 5 : 4};"
        >
          <!-- Header -->
          <div class="contents font-bold bg-[#142632]/90">
            <div class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]">
              ${translateText("leaderboard.team")}
            </div>
            ${this.showUnits
              ? html`
                  <div
                    class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]"
                  >
                    ${translateText("leaderboard.launchers")}
                  </div>
                  <div
                    class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]"
                  >
                    ${translateText("leaderboard.sams")}
                  </div>
                  <div
                    class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]"
                  >
                    ${translateText("leaderboard.warships")}
                  </div>
                  <div
                    class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]"
                  >
                    ${translateText("leaderboard.cities")}
                  </div>
                `
              : html`
                  <div
                    class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]"
                  >
                    ${translateText("leaderboard.owned")}
                  </div>
                  <div
                    class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]"
                  >
                    ${translateText("leaderboard.gold")}
                  </div>
                  <div
                    class="p-1.5 md:p-2.5 text-center border-b border-[#38505d]"
                  >
                    ${translateText("leaderboard.maxtroops")}
                  </div>
                `}
          </div>

          <!-- Data rows -->
          ${this.teams.map((team) =>
            this.showUnits
              ? html`
                  <div
                    class="contents hover:bg-[#142632]/90 text-center cursor-pointer ${team.isMyTeam
                      ? "font-bold"
                      : ""}"
                  >
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.teamName}
                    </div>
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.totalLaunchers}
                    </div>
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.totalSAMs}
                    </div>
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.totalWarShips}
                    </div>
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.totalCities}
                    </div>
                  </div>
                `
              : html`
                  <div
                    class="contents hover:bg-[#142632]/90 text-center cursor-pointer ${team.isMyTeam
                      ? "font-bold"
                      : ""}"
                  >
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.teamName}
                    </div>
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.totalScoreStr}
                    </div>
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.totalGold}
                    </div>
                    <div class="py-1.5 border-b border-[#38505d]/75">
                      ${team.totalMaxTroops}
                    </div>
                  </div>
                `,
          )}
        </div>
        <button
          class="m-1 mx-auto block rounded-sm border border-[#57bfd7]/30 bg-[#101a22]/90 px-2 py-0.5 text-xs text-[#e8f1f2] transition-colors hover:bg-[#142632]"
          aria-pressed=${String(this.showUnits)}
          @click=${() => {
            this.showUnits = !this.showUnits;
            this.requestUpdate();
          }}
        >
          ${this.showUnits
            ? translateText("leaderboard.show_control")
            : translateText("leaderboard.show_units")}
        </button>
      </div>
    `;
  }
}
