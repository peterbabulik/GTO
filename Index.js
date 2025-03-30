// Required Modules
import fetch from 'node-fetch';     // For Ollama API calls
import vm from 'node:vm';         // For sandboxed code execution
import util from 'node:util';     // For inspecting output and promisifying readline
import readline from 'node:readline'; // For command-line user input

// --- Configuration ---
const OLLAMA_API = 'http://localhost:11434/api/generate'; // Adjust if your Ollama runs elsewhere
const AI_MODEL = 'gemma3:1b'; // The specific model to use
const CODE_GEN_TEMPERATURE = 0.75; // Slightly higher temp might encourage more variety now
const MAX_ROUNDS = 5; // Number of questions to ask
const EXECUTION_TIMEOUT = 1000; // Max milliseconds to allow code snippet to run

// --- Ollama Communication (Keep as before) ---
async function askOllama(model, prompt, temperature = 0.7) {
    try {
        console.log(`--- Sending prompt to ${model} (Temp: ${temperature}) ---`);

        const response = await fetch(OLLAMA_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: { temperature: temperature }
            })
        });

        if (!response.ok) {
             console.error(`Ollama API Error: ${response.status} ${response.statusText}`);
             const errorBody = await response.text(); console.error("Error Body:", errorBody);
             return `[Error: Ollama API returned status ${response.status}]`;
        }
        const data = await response.json();
        if (data.error) {
            console.error('Ollama API Error Response:', data.error); return `[Error: ${data.error}]`;
        }
        if (typeof data.response !== 'string') {
             console.error('Ollama API did not return a string response:', data); return "[Error: Invalid response format from Ollama]";
        }
        let cleanedResponse = data.response.trim();
        // Basic cleanup of potential markdown backticks
        if (cleanedResponse.startsWith("```javascript")) { cleanedResponse = cleanedResponse.substring(13).trim(); }
         else if (cleanedResponse.startsWith("```js")) { cleanedResponse = cleanedResponse.substring(5).trim(); }
         else if (cleanedResponse.startsWith("```")) { cleanedResponse = cleanedResponse.substring(3).trim(); }
        if (cleanedResponse.endsWith("```")) { cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3).trim(); }
        return cleanedResponse;
    } catch (error) {
        console.error('Ollama API Error during fetch or processing:', error);
        return `[Error: Could not connect to Ollama or process request. Details: ${error.message}]`;
    }
}

// --- Code Snippet Generation & Execution ---
async function generateAndExecuteSnippet(aiModel, aiTemperature) {
    // --- REVISED PROMPT (Prevent Scope Error) ---
    const prompt = `Generate a short JavaScript code snippet (between 5 and 10 lines long).
The code MUST use at least one loop (for or while) or one conditional (if/else) to calculate a final value in a variable (e.g., 'result' or 'outputValue').
The code MUST conclude with EXACTLY ONE console.log() statement AFTER all loops or conditionals, printing only the single final calculated value.
IMPORTANT: Do NOT attempt to access loop counter variables (like 'i') AFTER the loop has finished.
Do not include comments. Do not log anything inside loops.

Output ONLY the JavaScript code block. Nothing else.`;
    // --- END OF REVISED PROMPT ---

    console.log(`\n[Requesting code snippet from ${aiModel}...]`);
    const codeSnippet = await askOllama(aiModel, prompt, aiTemperature);

    if (!codeSnippet || codeSnippet.startsWith('[Error:')) {
        console.error("Failed to get valid code snippet from AI:", codeSnippet);
        return null;
    }

    // --- Prepare Sandbox and Execute ---
    let capturedOutput = null;
    let executionError = null;
    const sandbox = {
        console: {
            log: (...args) => {
                if (capturedOutput === null) { // Capture only first log
                    capturedOutput = args.map(arg =>
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ');
                }
            },
            error: () => {}, warn: () => {}, info: () => {},
        },
        // Add Math if you want snippets to use it
        // Math: Math,
    };

    const context = vm.createContext(sandbox);
    console.log("\n--- Generated Code ---");
    console.log(codeSnippet);
    console.log("--------------------");
    console.log("[Executing code snippet safely...]");

    try {
        const script = new vm.Script(codeSnippet, { filename: 'ai-snippet.js' }); // Add filename for better errors
        script.runInContext(context, { timeout: EXECUTION_TIMEOUT });
    } catch (error) {
        console.error("[Code Execution Error]:", error.message);
        executionError = error.message;
    }

    console.log("[Execution Finished]");

    // --- Validate Execution Result ---
    if (executionError) {
        console.log("Result: Code failed to execute.");
        return { code: codeSnippet, output: null, error: `Execution failed: ${executionError}` };
    } else if (capturedOutput === null || capturedOutput === undefined) {
        console.log("Result: Code executed but produced no output via console.log().");
         return { code: codeSnippet, output: null, error: "No output produced" };
    } else {
         console.log(`Result: Code produced output: "${capturedOutput}"`);
         return { code: codeSnippet, output: capturedOutput, error: null }; // Success!
    }
}

// --- User Input Handling (Keep as before) ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = util.promisify(rl.question).bind(rl);
async function getUserInput(prompt) {
    let answer = "";
    while (!answer) {
        answer = await question(prompt);
        if (!answer) { console.log("Please enter your prediction."); }
    }
    return answer.trim();
}

// --- Main Game Loop (Keep as before) ---
async function runCodingGame() {
    console.log("\n===================================");
    console.log("   Welcome to Guess the Output!");
    console.log("===================================");
    console.log(`Predict the output of ${MAX_ROUNDS} JavaScript snippets.`);
    console.log(`Using AI Model: ${AI_MODEL}`);

    let score = 0;
    let round = 0;

    while(round < MAX_ROUNDS) {
        round++;
        console.log(`\n===== ROUND ${round}/${MAX_ROUNDS} =====`);

        const executionResult = await generateAndExecuteSnippet(AI_MODEL, CODE_GEN_TEMPERATURE);

        if (!executionResult || executionResult.error || executionResult.output === null) {
            console.log("There was an issue with this question. Skipping to the next one.");
            console.log(`Reason: ${executionResult?.error || 'Unknown generation issue.'}`);
            round--; // Decrement round count so we get MAX_ROUNDS valid questions
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue; // Attempt to generate a new snippet
        }

        const { code, output: correctOutput } = executionResult;

        console.log("\nPredict the output of this code:");
        console.log("--------------------");
        console.log(code);
        console.log("--------------------");
        const userAnswer = await getUserInput(`Your prediction: `);

        console.log(`\nYour prediction: "${userAnswer}"`);
        console.log(`Correct output:  "${correctOutput}"`);

        // Case-insensitive comparison might be friendlier for strings
        if (userAnswer.toLowerCase() === correctOutput.toLowerCase()) {
            console.log("🎉 Correct! +1 point");
            score++;
        } else {
            console.log("❌ Incorrect.");
        }
        console.log(`Current Score: ${score}/${round}`);
        if (round < MAX_ROUNDS) { await new Promise(resolve => setTimeout(resolve, 2500)); }
    }

    console.log("\n===================================");
    console.log(`      Game Over!`);
    console.log(`      Final Score: ${score}/${MAX_ROUNDS}`);
    console.log("===================================");
}

// --- Error Handling & Start (Keep as before) ---
process.on('uncaughtException', (error) => { console.error('FATAL Uncaught Exception:', error); process.exit(1); });
process.on('unhandledRejection', (reason, promise) => { console.error('FATAL Unhandled Rejection at:', promise, 'reason:', reason); process.exit(1); });

runCodingGame()
    .catch(error => { console.error("Critical error during game execution:", error); process.exit(1); })
    .finally(() => { rl.close(); console.log("\nExiting game."); });
