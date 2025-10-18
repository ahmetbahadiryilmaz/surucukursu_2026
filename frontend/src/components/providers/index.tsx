import { RecoilRoot } from "recoil";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DrivingSchoolManagerProvider } from "@/components/contexts/DrivingSchoolManagerContext";
import { SocketProvider } from "@/components/contexts/SocketContext";

import { ChildrenProps } from "@/shared/types";

import { APP_NAME } from "@/shared/consts/";
import SocketDisconnectModal from "@/components/SocketDisconnectModal";

function providers({ children }: ChildrenProps) {
  return (
    <RecoilRoot>
      <ThemeProvider defaultTheme="system" storageKey={`${APP_NAME}-ui-theme`}>
        <DrivingSchoolManagerProvider>
          <SocketProvider>
            {children}
            <SocketDisconnectModal />
          </SocketProvider>
        </DrivingSchoolManagerProvider>
      </ThemeProvider>
    </RecoilRoot>
  );
}

export default providers;
