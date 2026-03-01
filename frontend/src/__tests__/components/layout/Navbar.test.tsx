import { render, screen } from "../../test-utils";
import Navbar from "@/components/layout/Navbar";

// next/link mock
jest.mock("next/link", () => {
  const MockLink = ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}));

jest.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    connected: false,
    publicKey: null,
    signTransaction: null,
    disconnect: jest.fn(),
  }),
  useConnection: () => ({
    connection: {},
  }),
}));

jest.mock("@solana/wallet-adapter-react-ui", () => ({
  useWalletModal: () => ({ setVisible: jest.fn() }),
  WalletModalProvider: ({ children }: any) => children,
}));

describe("Navbar", () => {
  it("renders the KLIRA logo text", () => {
    render(<Navbar />);
    expect(screen.getByText("KLIRA")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<Navbar />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Trade")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  it("renders Connect Wallet button when not connected", () => {
    render(<Navbar />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("has nav element", () => {
    const { container } = render(<Navbar />);
    expect(container.querySelector("nav")).toBeTruthy();
  });

  it("has fixed positioning", () => {
    const { container } = render(<Navbar />);
    const nav = container.querySelector("nav")!;
    expect(nav.className).toContain("fixed");
    expect(nav.className).toContain("top-0");
  });

  it("has z-50 for proper stacking", () => {
    const { container } = render(<Navbar />);
    const nav = container.querySelector("nav")!;
    expect(nav.className).toContain("z-50");
  });

  it("has border bottom", () => {
    const { container } = render(<Navbar />);
    const nav = container.querySelector("nav")!;
    expect(nav.className).toContain("border-b");
  });

  it("has correct link hrefs", () => {
    render(<Navbar />);
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");

    const tradeLink = screen.getByText("Trade").closest("a");
    expect(tradeLink).toHaveAttribute("href", "/trade");

    const ordersLink = screen.getByText("Orders").closest("a");
    expect(ordersLink).toHaveAttribute("href", "/orders");
  });
});
