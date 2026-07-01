import { AirportExecution } from "../src/core/execution/AirportExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../src/core/game/Game";
import { GOLD_INDEX_AIR_TRADE } from "../src/core/StatsSchemas";
import { setup } from "./util/Setup";
import { constructionExecution } from "./util/utils";

let game: Game;
let player: Player;
let other: Player;

describe("AirportExecution", () => {
  beforeEach(async () => {
    game = await setup("plains", { instantBuild: true }, [
      new PlayerInfo("player", PlayerType.Human, "player_client", "player_id"),
      new PlayerInfo("other", PlayerType.Human, "other_client", "other_id"),
    ]);

    player = game.player("player_id");
    other = game.player("other_id");
    player.addGold(1_000_000n);
    other.addGold(1_000_000n);

    game.config().structureMinDist = () => 10;
    game.config().proximityBonusPortsNb = () => 0;
    game.config().tradeShipShortRangeDebuff = () => 0;
  });

  test("Destination airport chances scale with level", () => {
    player.conquer(game.ref(10, 10));
    other.conquer(game.ref(30, 30));

    const airport = player.buildUnit(UnitType.Airport, game.ref(10, 10), {});
    const otherAirport = other.buildUnit(
      UnitType.Airport,
      game.ref(30, 30),
      {},
    );
    otherAirport.increaseLevel();
    otherAirport.increaseLevel();

    const execution = new AirportExecution(airport);
    execution.init(game, 0);

    expect(execution.tradingAirports()).toHaveLength(3);
  });

  test("Automatic airport trade gives gold to both players and records stats", () => {
    game.config().tradeShipSpawnRate = () => 1;
    player.conquer(game.ref(10, 10));
    other.conquer(game.ref(30, 30));

    const startPlayerGold = player.gold();
    const startOtherGold = other.gold();
    const airport = player.buildUnit(UnitType.Airport, game.ref(10, 10), {});
    other.buildUnit(UnitType.Airport, game.ref(30, 30), {});
    const afterBuildPlayerGold = player.gold();
    const afterBuildOtherGold = other.gold();

    const execution = new AirportExecution(airport);
    execution.init(game, 0);
    execution.tick(0);

    expect(player.gold()).toBeGreaterThan(afterBuildPlayerGold);
    expect(other.gold()).toBeGreaterThan(afterBuildOtherGold);
    expect(startPlayerGold).toBeGreaterThan(afterBuildPlayerGold);
    expect(startOtherGold).toBeGreaterThan(afterBuildOtherGold);

    const stats = game.stats().getPlayerStats(player);
    expect(stats?.gold?.[GOLD_INDEX_AIR_TRADE]).toBeGreaterThan(0n);
  });

  test("Airport trade excludes embargoed players", () => {
    player.conquer(game.ref(10, 10));
    other.conquer(game.ref(30, 30));

    const airport = player.buildUnit(UnitType.Airport, game.ref(10, 10), {});
    other.buildUnit(UnitType.Airport, game.ref(30, 30), {});
    player.addEmbargo(other, false);

    const execution = new AirportExecution(airport);
    execution.init(game, 0);

    expect(execution.tradingAirports()).toHaveLength(0);
  });

  test("Construction starts airport trade execution", () => {
    game.config().tradeShipSpawnRate = () => 1;
    player.conquer(game.ref(10, 10));
    other.conquer(game.ref(30, 30));
    other.buildUnit(UnitType.Airport, game.ref(30, 30), {});

    constructionExecution(game, player, 10, 10, UnitType.Airport, 4);

    expect(player.units(UnitType.Airport)).toHaveLength(1);
    expect(player.gold()).toBeGreaterThan(0n);
  });
});
