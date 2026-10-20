
import Particle from './particle'
import {random} from './util'

type ThingOptions = {
  cw: number,
  ch: number,
  maxRockets: number,
  numParticles: number,
  scale?: number,
  hues?: number[],
  hueChance?: number,
  brightness?: number[]
}

export default class Things {

  private _set: Set<Particle>
  private maxRockets: number
  private numParticles: number
  private cw: number
  private ch: number
  private rockets: number
  private scale: number
  private hues: number[]
  private hueChance: number
  private brightness: number[]

  constructor ({
    maxRockets,
    numParticles,
    cw,
    ch,
    scale = 1,
    hues = [],
    hueChance = 0,
    brightness = [50, 60]
  }: ThingOptions) {
    this._set = new Set()
    this.rockets = 0
    this.maxRockets = maxRockets
    this.numParticles = numParticles
    this.cw = cw
    this.ch = ch
    this.scale = scale
    this.hues = hues
    this.hueChance = hueChance
    this.brightness = brightness
  }

  size () {
    return this._set.size
  }

  entries () {
    return this._set
  }

  clear () {
    this._set.clear()
  }

  delete (thing: Particle) {
    this._set.delete(thing)
  }

  add (thing: Particle) {
    this._set.add(thing)
  }


  /**
   * Turn a particle into many particles exploding in different directions.
   * Rocket is deleted afterwards,
   * @param {Particle} particle the rocket to start from.
   */
  explode (particle: Particle): void {
    this.rockets--
    for (let i = 0; i < this.numParticles; i += 1) {
      this.add(particle.clone())
    }
    this.delete(particle)
  }

  /**
   * Spawns a single rocket
   */
  spawnRocket (): void {
    this.rockets++
    // some rockets take one of the given hues (e.g. the winner's color), the others a random one
    const hue = this.hues.length > 0 && random(0, 1) < this.hueChance
      ? this.hues[Math.floor(random(0, this.hues.length))]
      : random(1, 360)
    this.add(new Particle({
      isRocket: true,
      hue,
      brightness: random(this.brightness[0], this.brightness[1]),
      scale: this.scale,
      position: {
        x: random(0, this.cw),
        y: this.ch
      }
    }))
  }

  /**
   * if we have less than required number of rockets, spawn one.
   * this mutates the Set, adding more rockets.
   */
  spawnRockets (): void {
    if (this.rockets < this.maxRockets) {
      this.spawnRocket()
    }
  }

}
