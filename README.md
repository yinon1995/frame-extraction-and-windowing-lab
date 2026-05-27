# Frame Extraction and Windowing Lab

Interactive educational lab for learning discrete-time frame extraction and windowing.

The app visualizes the chain:

$$
x[g]
\rightarrow
I_m
\rightarrow
x^{(m)}[\ell]
\rightarrow
t_g=\frac{g}{f_s}
\rightarrow
\tilde{x}^{(m)}[\ell]=x^{(m)}[\ell]w[\ell]
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

- how a discrete-time signal is indexed as \(x[g]\)
- how frame starts are computed with \(s_m=mH\)
- how frame intervals are defined as half-open intervals
- how local frame coordinates \(\ell\) map back to global coordinates \(g\)
- how sample indices become physical time through \(t_g=g/f_s\)
- how windowing modifies an already-extracted frame
- how rectangular and Hann windows affect frame samples
- how coherent gain \(CG_w\) is computed

---

## Core Mathematical Model

### Global signal

A discrete signal is represented as:

$$
\mathbf{x}
=
[x[0],x[1],\ldots,x[N-1]]^\top
$$

where:

$$
g\in\{0,1,\ldots,N-1\}
$$

### Frame start

For frame index \(m\), the start index is:

$$
s_m=mH
$$

where \(H\) is the hop size.

### Frame interval

The selected frame interval is:

$$
I_m=[s_m,s_m+L)
$$

The included discrete sample indices are:

$$
I_m=\{s_m,s_m+1,\ldots,s_m+L-1\}
$$

The right boundary \(s_m+L\) is exclusive. It is not included as a sample.

### Local-to-global coordinate mapping

Inside a frame, the local index is:

$$
\ell\in\{0,1,\ldots,L-1\}
$$

The local-to-global mapping is:

$$
g=mH+\ell
$$

Therefore:

$$
x^{(m)}[\ell]=x[mH+\ell]=x[g]
$$

### Physical time mapping

Each global sample index maps to physical time by:

$$
t_g=\frac{g}{f_s}
$$

The continuous time span of frame \(m\) is:

$$
\left[
\frac{s_m}{f_s},
\frac{s_m+L}{f_s}
\right)
$$

The last included sample occurs at:

$$
\frac{s_m+L-1}{f_s}
$$

This is not the same as the exclusive frame boundary.

### Window operator

Windowing is pointwise multiplication:

$$
\tilde{x}^{(m)}[\ell]
=
x^{(m)}[\ell]w[\ell]
$$

Vector form:

$$
\tilde{\mathbf{x}}^{(m)}
=
\mathbf{x}^{(m)}\odot\mathbf{w}
$$

Matrix form:

$$
\tilde{\mathbf{x}}^{(m)}
=
W\mathbf{x}^{(m)}
$$

where:

$$
W=\operatorname{diag}(w[0],\ldots,w[L-1])
$$

### Coherent gain

The coherent gain of a window is:

$$
CG_w=
\frac{1}{L}
\sum_{\ell=0}^{L-1}w[\ell]
$$

For the rectangular window:

$$
w[\ell]=1
$$

and:

$$
CG_w=1
$$

For the periodic Hann window:

$$
w[\ell]
=
\frac{1}{2}
\left(
1-\cos\left(\frac{2\pi\ell}{L}\right)
\right)
$$

For \(L=4\):

$$
w=[0,0.5,1,0.5]
$$

and:

$$
CG_w=0.5
$$

---

## App Structure

The lab is organized into five interactive steps.

### Step 1 — Global Samples

Shows the full discrete signal \(x[g]\), the selected sample, the selected frame region, and the relationship between index \(g\) and time \(t_g=g/f_s\).

### Step 2 — Frame Extraction

Shows how frame index \(m\) selects an interval:

$$
I_m=[s_m,s_m+L)
$$

It also visualizes overlap when \(H<L\), non-overlap when \(H=L\), and gaps when \(H>L\).

### Step 3 — Local Frame Coordinates

Shows the mapping:

$$
\ell
\rightarrow
g=mH+\ell
\rightarrow
x^{(m)}[\ell]=x[g]
$$

The table links local frame positions to global signal coordinates.

### Step 4 — Physical Time Mapping

Shows how discrete sample indices map to physical time.  
It separates:

- included sample times
- last included sample time
- exclusive frame boundary

### Step 5 — Window Operator

Shows pointwise windowing:

$$
x^{(m)}[\ell]
\times
w[\ell]
=
\tilde{x}^{(m)}[\ell]
$$

It includes rectangular and periodic Hann window examples.

---

## Main Features

- interactive parameter controls
- fixed-\(N\) and fixed-duration sampling modes
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

- invalid sampling frequency \(f_s\leq0\)
- frame length \(L>N\)
- no complete valid frame
- overlap mode \(H<L\)
- gap mode \(H>L\)
- invalid selected frame index \(m\)
- invalid local index \(\ell\)
- analytic-source Nyquist warning
- invalid window/coherent-gain state

These checks are intended to prevent misleading visualizations while learning the math.

---

## Requirements

Before publishing, verify exact versions from `package.json`.

Typical development environment:

- Node.js: 20+
- npm: 10+
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