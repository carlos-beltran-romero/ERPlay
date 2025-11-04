import type { FC, PropsWithChildren } from "react";
import Header from "./Header";

/**
 * Layout común con cabecera fija y contenido desplazable.
 */
const PageWithHeader: FC<PropsWithChildren> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Header />
    <main className="flex-1">{children}</main>
  </div>
);

export default PageWithHeader;
