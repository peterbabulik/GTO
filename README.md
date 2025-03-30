# Guess the Output (GTO) - AI Code Generation Game 🎮

## Overview

GTO (Guess the Output) is a command-line game where players are presented with short JavaScript code snippets and must predict their output. The unique aspect of this project is that the code snippets are generated **dynamically and locally** using the Ollama framework running the `gemma3:1b` large language model.

This project serves as both a simple game and an exploration into the capabilities and limitations of small, locally-run language models for code generation tasks, specifically running on lower-power devices like Android via Termux.

## Core Gameplay Loop

1.  **AI Generation:** The Node.js application prompts the local `gemma3:1b` model (via Ollama) to generate a short JavaScript code snippet with specific constraints (e.g., use loops/conditionals, produce a single output via `console.log`).
2.  **Validation & Execution:** The Node.js application receives the generated code and **safely executes it** within a sandboxed environment using Node's built-in `vm` module. This step captures the *actual* output and crucially validates if the code runs without errors and produces the expected single output.
3.  **Player Interaction:** If the generated code is valid, it's presented to the player in the console.
4.  **Prediction:** The player inputs their prediction of what the code will output.
5.  **Scoring:** The application compares the player's prediction to the validated, correct output and updates the score.
6.  **Repeat:** The loop continues for a set number of rounds.

## Technology Stack

*   **Runtime:** Node.js (Tested primarily in Termux on Android, but should work on standard Node environments)
*   **AI Framework:** Ollama (Running locally)
*   **AI Model:** `gemma3:1b` (A small, efficient model suitable for local execution)
*   **Code Execution Sandbox:** Node.js built-in `vm` module
*   **API Communication:** `node-fetch` (or built-in `fetch` in Node.js v18+)
*   **User Input:** Node.js built-in `readline` module

## AI Integration (`gemma3:1b` Experiment) 🧠

The core idea was to leverage a small, local LLM for dynamic content generation in the game.

*   **Initial Goal:** Use `gemma3:1b` to create varied and interesting JavaScript snippets for the player to analyze.
*   **Implementation:** Specific prompts were crafted to guide the AI, requesting code with loops/conditionals and a single `console.log` output placed correctly after the main logic. Constraints were added iteratively based on observed failures.
*   **Key Findings & Limitations:**
    *   **Structural Adherence:** The model became reasonably good at following structural requests (e.g., placing `console.log` *after* loops) **after specific, explicit instructions** were added to the prompt.
    *   **Scope Blindness (Major Issue):** The model consistently failed to understand JavaScript variable scope, frequently generating code that tried to access loop counter variables (like `i`) *outside* the loop, leading to `ReferenceError`. Explicit prompts to avoid this were largely ignored.
    *   **Logical Flaws:** Occasionally generated code with logical errors or conditions that would never be met, resulting in no output.
    *   **Constraint Following (Inconsistent):** Initially struggled to adhere to the "single output" rule, often placing `console.log` inside loops before the prompt was heavily refined.
    *   **Validation is NON-NEGOTIABLE:** The experiment clearly demonstrated that **trusting the AI's generated code without validation is impossible** with this model size. The Node.js `vm` execution layer is *essential* for catching errors and verifying output, allowing the game to function despite the AI's frequent mistakes.

## Current Status

*   ✅ Core game loop is functional.
*   ✅ AI generates JavaScript snippets.
*   ✅ Node.js safely executes snippets and determines the correct answer.
*   ✅ Player input and scoring work.
*   ⚠️ **AI Reliability:** `gemma3:1b` frequently generates code that throws errors (especially scope errors) or doesn't produce output. The game logic filters these out, but this means some rounds might require multiple generation attempts behind the scenes, potentially slowing down the start of a valid round. The quality and complexity of *valid* snippets are limited.
*   🧪 Primarily a proof-of-concept and exploration of local small LLM capabilities.

## How to Run

### Prerequisites

1.  **Node.js:** Installed on your system (tested with various versions, ensure `vm`, `readline`, `util` are available).
2.  **Ollama:** Installed and running. Make sure the Ollama server is accessible (defaults to `http://localhost:11434`).
3.  **`gemma3:1b` Model:** Download the model via Ollama: `ollama pull gemma3:1b`

### Installation

1.  **Clone Repository:** `git clone https://github.com/peterbabulik/GTO/`
2.  **Navigate:** `cd GTO`
3.  **Install Dependencies:** If you haven't used `node-fetch` before in the project: `npm install node-fetch` (May not be needed for Node.js v18+).
4.  **Create `package.json`:** Create a file named `package.json` in the project root with the following content to enable ES Module syntax (`import`):
    ```json
    {
      "type": "module"
    }
    ```

### Execution

1.  **Check API Endpoint:** Verify the `OLLAMA_API` constant in `index.js` matches your Ollama server address if it's not the default.
2.  **Run the Game:**
    ```bash
    node index.js
    ```
3.  Follow the prompts in your terminal to play!

## Future Ideas

*   Refine prompts further or experiment with prompt chaining.
*   Try slightly larger (but still local) models available via Ollama to see if scope understanding improves (e.g., `gemma:2b`, `phi3`).
*   Implement more sophisticated error handling and regeneration logic.
*   Add difficulty levels (e.g., request more complex code structures).
*   Introduce different game modes (e.g., "What variable value causes this output?", "Code completion").
*   Persist high scores.

## License

MIT
