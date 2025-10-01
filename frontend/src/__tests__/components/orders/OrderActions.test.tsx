import { render, screen, fireEvent } from "../../test-utils";
import OrderActions from "@/components/orders/OrderActions";
import type { StoredOrder } from "@/lib/order-store";

function createMockOrder(status: StoredOrder["status"]): StoredOrder {
  return {
    id: "kl_test",
    escrowAddress: "TestEscrow1111111111111111111111111111111",
    uniqueId: "1234567890",
    maker: "TestMaker1111111111111111111111111111111",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    inputSymbol: "SOL",
    outputSymbol: "USDC",
    makingAmount: "1000000000",
    takingAmount: "150000000",
    expiredAt: Date.now() + 86_400_000,
    createdAt: Date.now(),
    status,
  };
}

describe("OrderActions", () => {
  const defaultProps = {
    onCancel: jest.fn(),
    cancelLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Cancel button for open orders", () => {
    render(
      <OrderActions
        {...defaultProps}
        order={createMockOrder("open")}
      />
    );
    expect(screen.getByText("Cancel Order")).toBeInTheDocument();
  });

  it("returns null for filled orders", () => {
    const { container } = render(
      <OrderActions
        {...defaultProps}
        order={createMockOrder("filled")}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null for cancelled orders", () => {
    const { container } = render(
      <OrderActions
        {...defaultProps}
        order={createMockOrder("cancelled")}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null for expired orders", () => {
    const { container } = render(
      <OrderActions
        {...defaultProps}
        order={createMockOrder("expired")}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("calls onCancel with escrow address when clicked and confirmed", () => {
    const onCancel = jest.fn();
    const order = createMockOrder("open");
    window.confirm = jest.fn().mockReturnValue(true);
    render(
      <OrderActions
        order={order}
        onCancel={onCancel}
        cancelLoading={false}
      />
    );
    fireEvent.click(screen.getByText("Cancel Order"));
    expect(window.confirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledWith(order.escrowAddress);
  });

  it("does not call onCancel when confirmation is dismissed", () => {
    const onCancel = jest.fn();
    const order = createMockOrder("open");
    window.confirm = jest.fn().mockReturnValue(false);
    render(
      <OrderActions
        order={order}
        onCancel={onCancel}
        cancelLoading={false}
      />
    );
    fireEvent.click(screen.getByText("Cancel Order"));
    expect(window.confirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("shows 'Cancelling...' when loading", () => {
    render(
      <OrderActions
        order={createMockOrder("open")}
        onCancel={jest.fn()}
        cancelLoading={true}
      />
    );
    expect(screen.getByText("Cancelling...")).toBeInTheDocument();
  });

  it("disables cancel button when loading", () => {
    render(
      <OrderActions
        order={createMockOrder("open")}
        onCancel={jest.fn()}
        cancelLoading={true}
      />
    );
    const button = screen.getByText("Cancelling...");
    expect(button).toBeDisabled();
  });
});
