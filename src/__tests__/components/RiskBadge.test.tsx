import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/utils";
import { RiskBadge } from "@/components/RiskBadge";

describe("RiskBadge", () => {
    it.each([
        ["Green", "Safe"],
        ["LOW", "Safe"],
        ["Yellow", "Caution"],
        ["MEDIUM", "Caution"],
        ["Red", "High risk"],
        ["HIGH", "High risk"],
    ])("maps %s to %s", (risk, label) => {
        render(<RiskBadge risk={risk} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByLabelText(`Risk level: ${label}`)).toBeInTheDocument();
    });

    it("falls back to the raw risk label for unknown values", () => {
        render(<RiskBadge risk="Experimental" className="extra-class" />);
        expect(screen.getByText("Experimental")).toBeInTheDocument();
        expect(screen.getByLabelText("Risk level: Experimental")).toHaveClass("extra-class");
    });
});
