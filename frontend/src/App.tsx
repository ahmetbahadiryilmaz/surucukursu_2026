import Providers from "@/components/providers";
import { AppRouter } from "@/routing";

function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}

export default App;
