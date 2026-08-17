import { execFileSync } from 'node:child_process'

export default function globalSetup() {
  execFileSync('npm', ['run', 'seed'], { stdio: 'inherit' })
}
