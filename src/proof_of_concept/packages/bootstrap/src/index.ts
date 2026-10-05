// COMPOSITION ROOT – public API
export { ConfigError, loadConfig, type AppConfig, type Persistence } from './config.ts';
export {
  createContainer,
  type Container,
  type ContainerOptions,
  type DrivingPorts,
} from './container.ts';
