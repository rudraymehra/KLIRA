import { render, screen, fireEvent } from "../../test-utils";
import AmountInput from "@/components/trade/AmountInput";

describe("AmountInput", () => {
  const defaultProps = {
    value: "",
    onChange: jest.fn(),
    tokenSymbol: "SOL",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the input", () => {
    render(<AmountInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("renders the token symbol", () => {
    render(<AmountInput {...defaultProps} tokenSymbol="USDC" />);
    expect(screen.getByText("USDC")).toBeInTheDocument();
  });

  it("renders the label when provided", () => {
    render(<AmountInput {...defaultProps} label="Amount" />);
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("does not render label when not provided", () => {
    const { container } = render(<AmountInput {...defaultProps} />);
    const labels = container.querySelectorAll("label");
    expect(labels).toHaveLength(0);
  });

  it("renders Max button when onMaxClick provided", () => {
    render(<AmountInput {...defaultProps} onMaxClick={() => {}} />);
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("does not render Max button when onMaxClick not provided", () => {
    render(<AmountInput {...defaultProps} />);
    expect(screen.queryByText("Max")).not.toBeInTheDocument();
  });

  it("calls onMaxClick when Max button is clicked", () => {
    const onMaxClick = jest.fn();
    render(<AmountInput {...defaultProps} onMaxClick={onMaxClick} />);
    fireEvent.click(screen.getByText("Max"));
    expect(onMaxClick).toHaveBeenCalledTimes(1);
  });

  it("displays the current value", () => {
    render(<AmountInput {...defaultProps} value="123.45" />);
    const input = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    expect(input.value).toBe("123.45");
  });

  it("calls onChange for valid numeric input", () => {
    const onChange = jest.fn();
    render(<AmountInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith("42");
  });

  it("calls onChange for decimal input", () => {
    const onChange = jest.fn();
    render(<AmountInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "3.14" } });
    expect(onChange).toHaveBeenCalledWith("3.14");
  });

  it("calls onChange for empty input (clearing)", () => {
    const onChange = jest.fn();
    render(<AmountInput {...defaultProps} value="123" onChange={onChange} />);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("rejects non-numeric input", () => {
    const onChange = jest.fn();
    render(<AmountInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects input with multiple dots", () => {
    const onChange = jest.fn();
    render(<AmountInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "1.2.3" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("accepts input starting with dot", () => {
    const onChange = jest.fn();
    render(<AmountInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: ".5" } });
    expect(onChange).toHaveBeenCalledWith(".5");
  });

  it("disables input when disabled prop is true", () => {
    render(<AmountInput {...defaultProps} disabled />);
    const input = screen.getByPlaceholderText("0.00");
    expect(input).toBeDisabled();
  });

  it("applies opacity class when disabled", () => {
    const { container } = render(<AmountInput {...defaultProps} disabled />);
    const wrapper = container.querySelector(".opacity-50");
    expect(wrapper).toBeTruthy();
  });

  it("has decimal inputMode", () => {
    render(<AmountInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("0.00");
    expect(input).toHaveAttribute("inputMode", "decimal");
  });
});
