import { render, screen, fireEvent } from "../../test-utils";
import ExpirationPicker from "@/components/trade/ExpirationPicker";
import { EXPIRATION_OPTIONS } from "@/lib/constants";

describe("ExpirationPicker", () => {
  const defaultProps = {
    selected: "24h" as const,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Expiration label", () => {
    render(<ExpirationPicker {...defaultProps} />);
    expect(screen.getByText("Expiration")).toBeInTheDocument();
  });

  it("renders all expiration options", () => {
    render(<ExpirationPicker {...defaultProps} />);
    for (const opt of EXPIRATION_OPTIONS) {
      expect(screen.getByText(opt.label)).toBeInTheDocument();
    }
  });

  it("highlights the selected option", () => {
    render(<ExpirationPicker {...defaultProps} selected="24h" />);
    const selectedButton = screen.getByText("24 Hours");
    expect(selectedButton.className).toContain("neon-cyan");
    expect(selectedButton.className).toContain("bg-neon-cyan/10");
  });

  it("non-selected options have different styling", () => {
    render(<ExpirationPicker {...defaultProps} selected="24h" />);
    const otherButton = screen.getByText("1 Hour");
    expect(otherButton.className).toContain("text-white/40");
  });

  it("calls onSelect with correct value when option clicked", () => {
    const onSelect = jest.fn();
    render(<ExpirationPicker {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("7 Days"));
    expect(onSelect).toHaveBeenCalledWith("7d");
  });

  it("calls onSelect for each option", () => {
    const onSelect = jest.fn();
    render(<ExpirationPicker {...defaultProps} onSelect={onSelect} />);

    for (const opt of EXPIRATION_OPTIONS) {
      fireEvent.click(screen.getByText(opt.label));
    }

    expect(onSelect).toHaveBeenCalledTimes(EXPIRATION_OPTIONS.length);
  });

  it("renders buttons with type=button", () => {
    render(<ExpirationPicker {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute("type", "button");
    });
  });

  it("has correct number of buttons", () => {
    render(<ExpirationPicker {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(EXPIRATION_OPTIONS.length);
  });
});
