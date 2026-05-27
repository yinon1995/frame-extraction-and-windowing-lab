# Frame Extraction and Windowing Lab

Interactive educational lab for learning discrete-time frame extraction and windowing.

The app visualizes the chain:

$$
x[g]\rightarrow I_m\rightarrow x^{(m)}[\ell]\rightarrow t_g=\frac{g}{f_s}\rightarrow \tilde{x}^{(m)}[\ell]=x^{(m)}[\ell]w[\ell]
$$

It is designed for learning, technical study, and verification of basic DSP indexing rules.

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

A finite discrete-time signal is represented as:

$$
\mathbf{x}=\begin{bmatrix}
x[0] & x[1] & \cdots & x[N-1]
\end{bmatrix}^{\top}
$$

The global sample index is:

$$
g\in\{0,1,\ldots,N-1\}
$$

Here, $N$ is the total number of samples.

---

### Frame Start

For frame index $m$, the frame start index is:

$$
s_m=mH
$$

where:

- $m$ is the frame index
- $H$ is the hop size
- $s_m$ is the global start index of frame $m$

---

### Frame Interval

The selected frame interval is:

$$
I_m=[s_m,s_m+L)
$$

The included discrete sample indices are:

$$
I_m=\{s_m,s_m+1,\ldots,s_m+L-1\}
$$

The right boundary $s_m+L$ is exclusive. It is not included as a sample.

The frame contains exactly $L$ samples.

---

### Local-to-Global Coordinate Mapping

Inside a frame, the local index is:

$$
\ell\in\{0,1,\ldots,L-1\}
$$

The local-to-global mapping is:

$$
g=s_m+\ell
$$

Since $s_m=mH$, this is also:

$$
g=mH+\ell
$$

Therefore, the local frame sample is:

$$
x^{(m)}[\ell]=x[mH+\ell]=x[g]
$$

This is the central indexing rule of the lab.

---

### Active Frame Vector

The extracted frame is the vector:

$$
\mathbf{x}^{(m)}=\begin{bmatrix}
x^{(m)}[0] \\
x^{(m)}[1] \\
\vdots \\
x^{(m)}[L-1]
\end{bmatrix}
$$

Using the local-to-global mapping:

$$
\mathbf{x}^{(m)}=\begin{bmatrix}
x[mH] \\
x[mH+1] \\
\vdots \\
x[mH+L-1]
\end{bmatrix}
$$

---

### Physical Time Mapping

Each global sample index maps to physical time by:

$$
t_g=\frac{g}{f_s}
$$

where $f_s$ is the sampling frequency in Hz.

The continuous time span of frame $m$ is:

$$
\left[\frac{s_m}{f_s},\frac{s_m+L}{f_s}\right)
$$

The last included sample occurs at:

$$
\frac{s_m+L-1}{f_s}
$$

This is not the same as the exclusive frame boundary.

The exclusive frame boundary occurs at:

$$
\frac{s_m+L}{f_s}
$$

---

### Window Operator

Windowing is pointwise multiplication:

$$
\tilde{x}^{(m)}[\ell]=x^{(m)}[\ell]w[\ell]
$$

for:

$$
\ell\in\{0,1,\ldots,L-1\}
$$

Vector form:

$$
\tilde{\mathbf{x}}^{(m)}=\mathbf{x}^{(m)}\odot\mathbf{w}
$$

where $\odot$ denotes pointwise multiplication.

Matrix form:

$$
\tilde{\mathbf{x}}^{(m)}=W\mathbf{x}^{(m)}
$$

where:

$$
W=\operatorname{diag}(w[0],w[1],\ldots,w[L-1])
$$

---

### Coherent Gain

The coherent gain of a window is:

$$
CG_w=\frac{1}{L}\sum_{\ell=0}^{L-1}w[\ell]
$$

For the rectangular window:

$$
w[\ell]=1
$$

and therefore:

$$
CG_w=1
$$

For the periodic Hann window:

$$
w[\ell]=\frac{1}{2}\left(1-\cos\left(\frac{2\pi\ell}{L}\right)\right)
$$

For $L=4$:

$$
\mathbf{w}=\begin{bmatrix}
0 \\
0.5 \\
1 \\
0.5
\end{bmatrix}
$$

and:

$$
CG_w=0.5
$$

---

## App Structure

The lab is organized into five interactive steps.

---

### Step 1 — Global Samples

Shows the full discrete signal $x[g]$, the selected sample, the selected frame region, and the relationship between global index $g$ and time $t_g$.

The main relation is:

$$
t_g=\frac{g}{f_s}
$$

---

### Step 2 — Frame Extraction

Shows how frame index $m$ selects an interval:

$$
I_m=[s_m,s_m+L)
$$

with:

$$
s_m=mH
$$

The included sample set is:

$$
I_m=\{mH,mH+1,\ldots,mH+L-1\}
$$

The app also visualizes:

- overlap when $H<L$
- non-overlap when $H=L$
- gaps when $H>L$

---

### Step 3 — Local Frame Coordinates

Shows the mapping from local frame coordinates to global signal coordinates:

$$
\ell\rightarrow g=mH+\ell\rightarrow x^{(m)}[\ell]=x[g]
$$

The table links each local frame position $\ell$ to:

- global index $g$
- signal value $x[g]$
- local frame value $x^{(m)}[\ell]$

---

### Step 4 — Physical Time Mapping

Shows how discrete sample indices map to physical time.

It separates:

- included sample times
- last included sample time
- exclusive frame boundary

The main relation is:

$$
t_g=\frac{g}{f_s}
$$

The frame time interval is:

$$
\left[\frac{s_m}{f_s},\frac{s_m+L}{f_s}\right)
$$

The last included sample time is:

$$
t_{s_m+L-1}=\frac{s_m+L-1}{f_s}
$$

---

### Step 5 — Window Operator

Shows pointwise windowing:

$$
x^{(m)}[\ell]\cdot w[\ell]=\tilde{x}^{(m)}[\ell]
$$

The app includes:

- rectangular window
- periodic Hann window
- coherent gain display
- windowed frame visualization

---

## Main Features

- interactive parameter controls
- fixed-$N$ sampling mode
- fixed-duration sampling mode
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

Before publishing, verify exact versions from `package.json`.

Typical development environment:

- Node.js 20+
- npm 10+
- React
- TypeScript
- Vite
- Tailwind CSS
- KaTeX / react-katex
- Vitest

Do not rely on this section until the versions have been checked against the repository.

---

## Installation

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_FOLDER>
npm install
```

---

## Development

Run the development server:

```bash
npm run dev
```

Then open the local URL printed by Vite.

Usually:

```text
http://localhost:5173
```

---

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Tests

Run the test suite:

```bash
npm test
```

If the project uses Vitest directly:

```bash
npm run test
```

or:

```bash
npx vitest
```

---

## Repository Boundary

This repository is focused on one narrow educational problem:

> discrete-time frame extraction and windowing.

It does not attempt to be:

- a complete DSP framework
- a real-time audio processing engine
- a production signal-processing library
- a machine-learning project
- a general visualization platform

The goal is to make the indexing math clear, interactive, and verifiable.

---

## Mathematical Notation

| Symbol | Meaning |
|---|---|
| $x[g]$ | Global discrete-time signal sample |
| $g$ | Global sample index |
| $N$ | Total number of samples |
| $m$ | Frame index |
| $H$ | Hop size |
| $L$ | Frame length |
| $s_m$ | Start index of frame $m$ |
| $I_m$ | Index set of frame $m$ |
| $\ell$ | Local index inside a frame |
| $f_s$ | Sampling frequency |
| $t_g$ | Physical time of sample $g$ |
| $w[\ell]$ | Window coefficient |
| $\mathbf{w}$ | Window vector |
| $\tilde{x}^{(m)}[\ell]$ | Windowed frame sample |
| $CG_w$ | Coherent gain of the window |

---

## Example

For:

$$
N=8,\quad L=4,\quad H=2,\quad m=1
$$

The frame start is:

$$
s_1=mH=1\cdot2=2
$$

The frame interval is:

$$
I_1=[2,6)
$$

The included indices are:

$$
I_1=\{2,3,4,5\}
$$

The local-to-global mapping is:

$$
g=2+\ell
$$

so:

$$
\ell=0\Rightarrow g=2
$$

$$
\ell=1\Rightarrow g=3
$$

$$
\ell=2\Rightarrow g=4
$$

$$
\ell=3\Rightarrow g=5
$$

The extracted frame is:

$$
\mathbf{x}^{(1)}=\begin{bmatrix}
x[2] \\
x[3] \\
x[4] \\
x[5]
\end{bmatrix}
$$

---

## GitHub Math Rendering Notes

This README uses GitHub-compatible Markdown math.

Short inline expressions use single-dollar syntax, for example `$x[g]$`, `$f_s$`, and `$\ell$`.

Displayed equations use double-dollar blocks with the opening and closing `$$` on their own lines.

Important rendering rule for this repository:

Do not split the left-hand side and the equals sign across separate lines inside display math.

Use this:

```text
$$
\mathbf{x}=\begin{bmatrix}
x[0] & x[1] & \cdots & x[N-1]
\end{bmatrix}^{\top}
$$
```

Do not use this:

```text
$$
\mathbf{x}
=
\begin{bmatrix}
x[0] & x[1] & \cdots & x[N-1]
\end{bmatrix}^{\top}
$$
```

Do not write multi-line equations inside single-dollar inline math. GitHub may render them as broken raw LaTeX.

---

## Status

Current status: educational DSP visualization lab.

The mathematical model is intentionally small and explicit.

The next quality bar is not adding more features. The next quality bar is keeping the math, UI labels, tests, and README perfectly aligned.
