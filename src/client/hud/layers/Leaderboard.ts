import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { renderTroops, translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { Controller } from "../../Controller";
import { GoToPlayerEvent } from "../../TransformHandler";
import { formatPercentage, renderNumber } from "../../Utils";
import { GameView, PlayerView } from "../../view";

interface Entry {
  name: string;
  position: number;
  score: string;
  gold: string;
  maxTroops: string;
  isMyPlayer: boolean;
  isOnSameTeam: boolean;
  player: PlayerView;
}

@customElement("leader-board")
export class Leaderboard extends LitElement implements Controller {
  public game: GameView | null = null;
  public eventBus: EventBus | null = null;

  players: Entry[] = [];

  @property({ type: Boolean }) visible = false;
  private showTopFive = true;

  @state()
  private _sortKey: "tiles" | "gold" | "maxtroops" = "tiles";

  @state()
  private _sortOrder: "asc" | "desc" = "desc";

  createRenderRoot() {
    return this; // use light DOM for Tailwind support
  }

  init() {}

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has("visible") && this.visible) {
      this.updateLeaderboard();
    }
  }

  getTickIntervalMs() {
    return 1000;
  }

  tick() {
    if (this.game === null) throw new Error("Not initialized");
    if (!this.visible) return;
    this.updateLeaderboard();
  }

  private setSort(key: "tiles" | "gold" | "maxtroops") {
    if (this._sortKey === key) {
      this._sortOrder = this._sortOrder === "asc" ? "desc" : "asc";
    } else {
      this._sortKey = key;
      this._sortOrder = "desc";
    }
    this.updateLeaderboard();
  }

  private updateLeaderboard() {
    if (this.game === null) throw new Error("Not initialized");
    const myPlayer = this.game.myPlayer();

    interface PlayerViewTroopsCache {
      pv: PlayerView;
      maxTroops: number;
    }

    const compare = (a: number, b: number) =>
      this._sortOrder === "asc" ? a - b : b - a;

    const maxTroops = (p: PlayerView) => this.game!.config().maxTroops(p);

    const sorted: PlayerViewTroopsCache[] = this.game
      .playerViews()
      .map((p) => ({ pv: p, maxTroops: maxTroops(p) }));

    switch (this._sortKey) {
      case "gold":
        sorted.sort((a, b) =>
          compare(Number(a.pv.gold()), Number(b.pv.gold())),
        );
        break;
      case "maxtroops":
        sorted.sort((a, b) => compare(a.maxTroops, b.maxTroops));
        break;
      default:
        sorted.sort((a, b) =>
          compare(a.pv.numTilesOwned(), b.pv.numTilesOwned()),
        );
    }

    const numTilesWithoutFallout =
      this.game.numLandTiles() - this.game.numTilesWithFallout();

    const alivePlayers = sorted.filter((player) => player.pv.isAlive());
    const playersToShow = this.showTopFive
      ? alivePlayers.slice(0, 5)
      : alivePlayers;

    this.players = playersToShow.map((playerCache, index) => {
      const player = playerCache.pv;
      const maxTroops = playerCache.maxTroops;
      return {
        name: player.displayName(),
        position: index + 1,
        score: formatPercentage(
          player.numTilesOwned() / numTilesWithoutFallout,
        ),
        gold: renderNumber(player.gold()),
        maxTroops: renderTroops(maxTroops),
        isMyPlayer: player === myPlayer,
        isOnSameTeam:
          myPlayer !== null &&
          (player === myPlayer || player.isOnSameTeam(myPlayer)),
        player: player,
      };
    });

    if (
      myPlayer !== null &&
      this.players.find((p) => p.isMyPlayer) === undefined
    ) {
      let place = 0;
      for (const p of sorted) {
        place++;
        if (p.pv === myPlayer) {
          break;
        }
      }

      if (myPlayer.isAlive()) {
        const myPlayerMaxTroops = this.game!.config().maxTroops(myPlayer);
        this.players.pop();
        this.players.push({
          name: myPlayer.displayName(),
          position: place,
          score: formatPercentage(
            myPlayer.numTilesOwned() / this.game.numLandTiles(),
          ),
          gold: renderNumber(myPlayer.gold()),
          maxTroops: renderTroops(myPlayerMaxTroops),
          isMyPlayer: true,
          isOnSameTeam: true,
          player: myPlayer,
        });
      }
    }

    this.requestUpdate();
  }

  private handleRowClickPlayer(player: PlayerView) {
    if (this.eventBus === null) return;
    this.eventBus.emit(new GoToPlayerEvent(player));
  }

  render() {
    if (!this.visible) {
      return html``;
    }
    return html`
      <div
        class="max-h-[35vh] overflow-y-auto text-white text-xs md:text-xs lg:text-sm md:max-h-[50vh] mt-2 ${this
          .visible
          ? ""
          : "hidden"}"
        @contextmenu=${(e: Event) => e.preventDefault()}
      >
        <div
          class="grid bg-[#101a22]/92 w-full text-xs md:text-xs lg:text-sm rounded-md overflow-hidden ring-1 ring-[#57bfd7]/20 shadow-lg"
          style="grid-template-columns: minmax(24px, 30px) minmax(60px, 100px) minmax(45px, 70px) minmax(40px, 55px) minmax(55px, 105px);"
        >
          <div class="contents font-bold bg-[#142632]/90 text-[#e8f1f2]">
            <div class="py-1 md:py-2 text-center border-b border-[#38505d]">
              #
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-[#38505d] truncate"
            >
              ${translateText("leaderboard.player")}
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-[#38505d] cursor-pointer whitespace-nowrap truncate hover:text-[#57bfd7]"
              @click=${() => this.setSort("tiles")}
            >
              ${translateText("leaderboard.owned")}
              ${this._sortKey === "tiles"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-[#38505d] cursor-pointer whitespace-nowrap truncate hover:text-[#57bfd7]"
              @click=${() => this.setSort("gold")}
            >
              ${translateText("leaderboard.gold")}
              ${this._sortKey === "gold"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-[#38505d] cursor-pointer whitespace-nowrap truncate hover:text-[#57bfd7]"
              @click=${() => this.setSort("maxtroops")}
            >
              ${translateText("leaderboard.maxtroops")}
              ${this._sortKey === "maxtroops"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
          </div>

          ${repeat(
            this.players,
            (p) => p.player.id(),
            (player, index) => html`
              <div
                class="contents hover:bg-[#142632]/90 ${player.isOnSameTeam
                  ? "font-bold"
                  : ""} cursor-pointer"
                @click=${() => this.handleRowClickPlayer(player.player)}
              >
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-[#38505d]/75"
                    : ""}"
                >
                  ${player.position}
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-[#38505d]/75"
                    : ""} truncate"
                >
                  ${player.name}
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-[#38505d]/75"
                    : ""}"
                >
                  ${player.score}
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-[#38505d]/75"
                    : ""}"
                >
                  ${player.gold}
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-[#38505d]/75"
                    : ""}"
                >
                  ${player.maxTroops}
                </div>
              </div>
            `,
          )}
        </div>
      </div>

      <button
        class="mt-2 p-0.5 px-1.5 md:px-2 text-xs md:text-xs lg:text-sm 
        border rounded-sm border-[#57bfd7]/30 transition-colors
        text-[#e8f1f2] mx-auto block hover:bg-[#142632] bg-[#101a22]/90"
        @click=${() => {
          this.showTopFive = !this.showTopFive;
          this.updateLeaderboard();
        }}
      >
        ${this.showTopFive ? "+" : "-"}
      </button>
    `;
  }
}
