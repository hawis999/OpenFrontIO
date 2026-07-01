import { Execution, Game, Unit, UnitType } from "../game/Game";
import { PseudoRandom } from "../PseudoRandom";

export class AirportExecution implements Execution {
  private active = true;
  private mg: Game;
  private random: PseudoRandom;
  private checkOffset: number;
  private airTradeRejections = 0;

  constructor(private airport: Unit) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    this.random = new PseudoRandom(mg.ticks());
    this.checkOffset = mg.ticks() % 10;
  }

  tick(ticks: number): void {
    if (!this.airport.isActive()) {
      this.active = false;
      return;
    }

    if (this.airport.isUnderConstruction()) {
      return;
    }

    if ((this.mg.ticks() + this.checkOffset) % 10 !== 0) {
      return;
    }

    if (!this.shouldTrade()) {
      return;
    }

    const destinations = this.tradingAirports();
    if (destinations.length === 0) {
      return;
    }

    const destination = this.random.randElement(destinations);
    this.completeTrade(destination);
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  shouldTrade(): boolean {
    const spawnRate = this.mg
      .config()
      .tradeShipSpawnRate(this.airTradeRejections, 0);
    for (let i = 0; i < this.airport.level(); i++) {
      if (this.random.chance(spawnRate)) {
        this.airTradeRejections = 0;
        return true;
      }
      this.airTradeRejections++;
    }
    return false;
  }

  tradingAirports(): Unit[] {
    const airports = this.mg
      .players()
      .filter(
        (p) =>
          p !== this.airport.owner() && p.canTrade(this.airport.owner()),
      )
      .flatMap((p) => p.units(UnitType.Airport))
      .filter(
        (airport) =>
          airport.isActive() &&
          !airport.isUnderConstruction() &&
          !airport.isMarkedForDeletion(),
      )
      .sort((a, b) => {
        return (
          this.mg.manhattanDist(this.airport.tile(), a.tile()) -
          this.mg.manhattanDist(this.airport.tile(), b.tile())
        );
      });

    const weightedAirports: Unit[] = [];
    for (const [i, otherAirport] of airports.entries()) {
      const expanded = new Array(otherAirport.level()).fill(otherAirport);
      weightedAirports.push(...expanded);

      const tooClose =
        this.mg.manhattanDist(this.airport.tile(), otherAirport.tile()) <
        this.mg.config().tradeShipShortRangeDebuff();
      const closeBonus =
        i < this.mg.config().proximityBonusPortsNb(airports.length);
      if (!tooClose && closeBonus) {
        weightedAirports.push(...expanded);
      }
      if (!tooClose && this.airport.owner().isFriendly(otherAirport.owner())) {
        weightedAirports.push(...expanded);
      }
    }
    return weightedAirports;
  }

  private completeTrade(destination: Unit): void {
    const sourceOwner = this.airport.owner();
    const destinationOwner = destination.owner();
    if (!sourceOwner.canTrade(destinationOwner)) {
      return;
    }

    const tilesTraveled = this.mg.manhattanDist(
      this.airport.tile(),
      destination.tile(),
    );
    const gold = this.mg.config().tradeShipGold(tilesTraveled, sourceOwner);
    sourceOwner.addGold(gold, this.airport.tile());
    destinationOwner.addGold(gold, destination.tile());
    this.mg.stats().airTrade(sourceOwner, destinationOwner, gold);
  }
}
