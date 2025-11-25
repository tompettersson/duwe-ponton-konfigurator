import { NewPontoonConfigurator } from "./components/NewPontoonConfigurator";
import { LoginOverlay } from "./components/LoginOverlay";

/**
 * Home page component that renders the pontoon configurator
 * Protected by LoginOverlay (duwe/preview)
 */
export default function Home() {
  return (
    <LoginOverlay>
      <NewPontoonConfigurator />
    </LoginOverlay>
  );
}
