import { render, screen } from "../../test-utils";
import Footer from "@/components/layout/Footer";

describe("Footer", () => {
  it("renders the KLIRA brand name", () => {
    render(<Footer />);
    expect(screen.getByText("KLIRA")).toBeInTheDocument();
  });

  it("renders the version number", () => {
    render(<Footer />);
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<Footer />);
    expect(
      screen.getByText(/Rent-free limit orders on Solana/)
    ).toBeInTheDocument();
  });

  it("renders GitHub link", () => {
    render(<Footer />);
    const githubLink = screen.getByText("GitHub");
    expect(githubLink).toBeInTheDocument();
    expect(githubLink.tagName).toBe("A");
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders Twitter link", () => {
    render(<Footer />);
    const twitterLink = screen.getByText("Twitter");
    expect(twitterLink).toBeInTheDocument();
    expect(twitterLink.tagName).toBe("A");
    expect(twitterLink).toHaveAttribute("target", "_blank");
    expect(twitterLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has footer element", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeTruthy();
  });

  it("has border styling", () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector("footer")!;
    expect(footer.className).toContain("border-t");
  });
});
