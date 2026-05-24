# Frame Extraction and Windowing Lab

Interactive educational lab for learning discrete-time frame extraction and windowing.

The app visualizes the chain:

```math
x[g]
\rightarrow
I_m
\rightarrow
x^{(m)}[\ell]
\rightarrow
t_g=\frac{g}{f_s}
\rightarrow
\tilde{x}^{(m)}[\ell]=x^{(m)}[\ell]w[\ell]
```

This project is designed for learning, technical study, and verification of basic DSP indexing rules.

It is not a production DSP library.

---

## Live Demo

Use the live app here:

[Open the live app](https://ais-pre-crtl34r6z5mcftre2okjug-145863851003.europe-west2.run.app)

---

## What This Lab Teaches

This lab focuses on the exact mechanics of framing and windowing:

- how a discrete-time signal is indexed as $x[g]$
- how frame starts are computed with $s_m=mH$
- how frame intervals are defined as half-open intervals
- how local frame coordinates $\ell$ map back to global coordinates $g$
- how sample indices become physical time through $t_g=g/f_s$
- how windowing modifies an already-extracted frame
- how rectangular and Hann windows affect frame samples
- how coherent gain $CG_w$ is computed

---

## Core Mathematical Model

### Global Signal

A discrete signal is represented as:

```math
\mathbf{x}
=
[x[0],x[1],\ldots,x[N-1]]^\top
```

where:

```math
g\in\{0,1,\ldots,N-1\}
```

Here, $g$ is the global sample index.

---

### Frame Start

For frame index $m$, the start index is:

```math
s_m=mH
```

where $H$ is the hop size.

---

### Frame Interval

The selected frame interval is the half-open interval:

```math
I_m=[s_m,s_m+L)
```

The included discrete sample indices are:

```math
I_m=\{s_m,s_m+1,\ldots,s_m+L-1\}
```

The right boundary $s_m+L$ is exclusive. It is not included as a sample.

---

### Local-to-Global Coordinate Mapping

Inside a frame, the local index is:

```math
\ell\in\{0,1,\ldots,L-1\}
```

The local-to-global mapping is:

```math
g=mH+\ell
```

Therefore:

```math
x^{(m)}[\ell]=x[mH+\ell]=x[g]
```

---

### Physical Time Mapping

Each global sample index maps to physical time by:

```math
t_g=\frac{g}{f_s}
```

The continuous time span of frame $m$ is:

```math
\left[
\frac{s_m}{f_s},
\frac{s_m+L}{f_s}
\right)
```

The last included sample occurs at:

```math
\frac{s_m+L-1}{f_s}
```

This is not the same as the exclusive frame boundary.

---

### Window Operator

Windowing is pointwise multiplication:

```math
\tilde{x}^{(m)}[\ell]
=
x^{(m)}[\ell]w[\ell]
```

Vector form:

```math
\tilde{\mathbf{x}}^{(m)}
=
\mathbf{x}^{(m)}\odot\mathbf{w}
```

Matrix form:

```math
\tilde{\mathbf{x}}^{(m)}
=
W\mathbf{x}^{(m)}
```

where:

```math
W=\operatorname{diag}(w[0],\ldots,w[L-1])
```

---

### Coherent Gain

The coherent gain of a window is:

```math
CG_w=
\frac{1}{L}
\sum_{\ell=0}^{L-1}w[\ell]
```

For the rectangular window:

```math
w[\ell]=1
```

and:

```math
CG_w=1
```

For the periodic Hann window:

```math
w[\ell]
=
\frac{1}{2}
\left(
1-\cos\left(\frac{2\pi\ell}{L}\right)
\right)
```

For $L=4$:

```math
w=[0,0.5,1,0.5]
```

and:

```math
CG_w=0.5
```

---

## App Structure

The lab is organized into five interactive steps.

### Step 1 — Global Samples

Shows the full discrete signal $x[g]$, the selected sample, the selected frame region, and the relationship between global index $g$ and physical time $t_g=g/f_s$.

### Step 2 — Frame Extraction

Shows how frame index $m$ selects an interval:

```math
I_m=[s_m,s_m+L)
```

It also visualizes:

- overlap when $H<L$
- non-overlap when $H=L$
- gaps when $H>L$

### Step 3 — Local Frame Coordinates

Shows the mapping:

```math
\ell
\rightarrow
g=mH+\ell
\rightarrow
x^{(m)}[\ell]=x[g]
```

The table links local frame positions to global signal coordinates.

### Step 4 — Physical Time Mapping

Shows how discrete sample indices map to physical time. It separates:

- included sample times
- last included sample time
- exclusive frame boundary

### Step 5 — Window Operator

Shows pointwise windowing:

```math
x^{(m)}[\ell]
\times
w[\ell]
=
\tilde{x}^{(m)}[\ell]
```

It includes rectangular and periodic Hann window examples.

---

## Main Features

- interactive parameter controls
- fixed-$N$ and fixed-duration sampling modes
- analytic continuous-source mode
- discrete-only mode
- interpolation-guide mode
- visual playback / sample scan
- expanded graph views
- local coordinate tables
- validation guardrails for invalid configurations
- rectangular and Hann window operators
- coherent gain display
- mathematical test suite

---

## Validation Guardrails

The app includes educational validation checks for configurations such as:

- invalid sampling frequency $f_s\leq0$
- frame length $L>N$
- no complete valid frame
- overlap mode $H<L$
- gap mode $H>L$
- invalid selected frame index $m$
- invalid local index $\ell$
- analytic-source Nyquist warning
- invalid window/coherent-gain state

These checks are intended to prevent misleading visualizations while learning the math.

---

## Requirements

Recommended development environment:

- Node.js: 20+
- npm: 10+
- React
- TypeScript
- Vite
- Tailwind CSS
- KaTeX / react-katex
- Vitest

For exact dependency versions, see `package.json`.

---

## Installation

```bash
git clone https://github.com/yinon1995/frame-extraction-and-windowing-lab.git
cd frame-extraction-and-windowing-lab
npm install
```

---

## Running Locally

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal.

Common default:

```text
http://localhost:5173
```

If this project configures a different port, use the terminal output.

---

## Testing and Build

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected:

- `npm run lint` passes type/lint checks
- `npm run test` passes mathematical invariant tests
- `npm run build` creates a production build

---

## Project Structure

```text
src/
  components/
  math/
  tests/
  App.tsx
  main.tsx
```

Important math modules:

```text
src/math/framing.ts
src/math/signal.ts
src/math/window.ts
src/math/validation.ts
```

---

## Educational Use

This project is intended for learning and technical study.

It may contain mistakes, simplifications, or implementation limitations.

If you find a mathematical, technical, or implementation error, please contact:

[yinoncoscas1995@gmail.com](mailto:yinoncoscas1995@gmail.com)

---

## Author

Created by **Yinon Coscas**.

Email: [yinoncoscas1995@gmail.com](mailto:yinoncoscas1995@gmail.com)

---

## License

No license has been selected yet.

Before reusing, modifying, or distributing this project, please contact the author unless a license file is added later.
