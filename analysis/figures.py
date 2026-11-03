"""Figures (PLAN.md phase 7): the sensitivity analysis, one figure per usage profile [M10].

Five small multiples, one per criterion: the weight of that criterion on x (0...1), the WSM
aggregate score on y, one line per model; a dashed line marks the profile's own weight.
Colors follow the dataviz reference palette in its fixed order (validated for adjacent pairs);
every model also has its own marker shape, so identity does not rest on color alone, and the
exact values are in sensitivity.csv. PNG metadata without the software version, so that the
same data gives the same file [M13].
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

# Reference palette, categorical slots 1-8 (light mode), in fixed order; one per model id.
PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
MARKERS = ["o", "s", "^", "D", "v", "P", "X", "*"]
INK = "#0b0b0b"
INK_2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
SURFACE = "#ffffff"


def model_style(all_models):
    """Color and marker per model id, by its position in config/models.json (never by rank)."""
    return {m: (PALETTE[i % len(PALETTE)], MARKERS[i % len(MARKERS)]) for i, m in enumerate(all_models)}


def sensitivity_figure(sens, weights, models, style, title, path):
    criteria = list(weights)
    fig, axes = plt.subplots(1, len(criteria), figsize=(15, 3.6), sharey=True, facecolor=SURFACE)
    for ax, c in zip(axes, criteria):
        part = sens[sens["criterion"] == c].sort_values("weight")
        for m in models:
            color, marker = style[m]
            ax.plot(part["weight"], part[f"score_{m}"], color=color, linewidth=2, marker=marker,
                    markersize=6, markevery=4, markeredgecolor=SURFACE, markeredgewidth=1, label=m)
        ax.axvline(weights[c], color=MUTED, linewidth=1, linestyle="--")
        ax.set_title(c, color=INK, fontsize=11)
        ax.set_xlabel(f"weight of {c}", color=INK_2, fontsize=9)
        ax.set_xlim(0, 1)
        ax.set_facecolor(SURFACE)
        ax.grid(True, color=GRID, linewidth=0.6)
        ax.set_axisbelow(True)
        for side in ["top", "right"]:
            ax.spines[side].set_visible(False)
        for side in ["left", "bottom"]:
            ax.spines[side].set_color(AXIS)
        ax.tick_params(colors=INK_2, labelsize=8)
    axes[0].set_ylabel("aggregate score (WSM)", color=INK_2, fontsize=9)
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="upper center", ncol=len(models), frameon=False, fontsize=9,
               bbox_to_anchor=(0.5, 1.02), labelcolor=INK)
    fig.suptitle(title, y=1.10, color=INK, fontsize=12)
    fig.text(0.5, -0.06, "Dashed line: the weight of the profile. The other weights change in proportion so that the sum stays 1.",
             ha="center", color=MUTED, fontsize=8)
    fig.savefig(path, dpi=150, bbox_inches="tight", metadata={"Software": None})
    plt.close(fig)
