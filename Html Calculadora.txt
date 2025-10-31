<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculadora Legendaria 💸</title>
  <style>
    /* Basic body styling for full-screen display and gradient background */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #ff6f61, #ffb3a7); /* Gradient background */
      display: flex;
      justify-content: center; /* Center horizontally */
      align-items: center; /* Center vertically */
      height: 100vh; /* Full viewport height */
      margin: 0;
      padding: 15px; /* Padding around the body */
      color: #333;
      overflow: hidden; /* Prevent scrollbars from popping up due to animations */
    }
    /* Container for the calculator elements */
    .container {
      background: white;
      padding: 30px;
      border-radius: 20px; /* Rounded corners */
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2); /* Soft shadow for depth */
      max-width: 450px; /* Maximum width for larger screens */
      width: 100%; /* Full width on smaller screens */
      text-align: center;
      position: relative; /* For absolute positioning of animated elements */
      overflow: hidden; /* Hide overflowing animations */
      transition: background 0.5s ease; /* Smooth transition for background color */
    }
    /* Heading style */
    h2 {
      color: #c2185b; /* Deep pink color */
      margin-bottom: 25px;
      font-size: 2em; /* Larger font size */
      font-weight: 600; /* Bolder text */
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle text shadow */
    }
    /* Label style */
    label {
      font-size: 1.3em;
      color: #444;
      display: block; /* Make it a block element */
      margin-bottom: 15px;
    }
    /* Input field styling */
    input[type="number"] {
      width: 100%;
      padding: 14px;
      font-size: 1.2em;
      border: 2px solid #ff8a80; /* Pink border */
      border-radius: 12px; /* Rounded input field */
      outline: none; /* Remove default outline */
      transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transitions for focus effects */
    }
    /* Input field focus effect */
    input[type="number"]:focus {
      border-color: #c2185b; /* Darker pink border on focus */
      box-shadow: 0 0 10px rgba(194, 24, 91, 0.4); /* Glow effect on focus */
    }
    /* Button styling */
    button {
      background: #c2185b; /* Deep pink background */
      color: white;
      border: none;
      padding: 15px 25px;
      font-size: 1.3em;
      border-radius: 12px; /* Rounded button */
      cursor: pointer; /* Pointer on hover */
      transition: background 0.3s, transform 0.2s; /* Smooth transitions for hover/active */
      margin-top: 20px;
      width: 100%; /* Full width button */
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Button shadow */
      position: relative; /* For particle animations */
      overflow: hidden; /* Hide overflowing particles */
    }
    /* Button hover effect */
    button:hover {
      background: #8e0038; /* Darker pink on hover */
    }
    /* Button active (click) effect */
    button:active {
      transform: scale(0.95); /* Slightly shrink on click */
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Smaller shadow on click */
    }

    /* New: Button Pulse Animation */
    .button-pulse {
      animation: pulse 0.6s ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }

    /* Result display area */
    #resultado {
      margin-top: 25px;
      font-size: 1.5em;
      color: #00796b; /* Teal color for result */
      font-weight: 600;
      background: #e0f7fa; /* Light blue background for result */
      padding: 10px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      position: relative;
      min-height: 40px; /* Minimum height to prevent content jump */
      opacity: 0; /* Initially hidden for fade-in */
    }

    /* New: Result Fade-in and Bounce Animation */
    .result-show {
      animation: fadeInBounce 0.8s ease-out forwards;
    }
    @keyframes fadeInBounce {
      0% { opacity: 0; transform: translateY(20px); }
      70% { opacity: 1; transform: translateY(-5px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    /* Vibration animation for result */
    .vibrate {
      animation: vibrate 0.3s ease;
    }
    @keyframes vibrate {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-5px); }
      40% { transform: translateX(5px); }
      60% { transform: translateX(-3px); }
      80% { transform: translateX(3px); }
    }
    /* Sparkle effects before and after the result */
    .sparkles::before, .sparkles::after {
      content: '';
      position: absolute;
      background: radial-gradient(circle, rgba(255, 215, 0, 0.8), transparent); /* Gold radial gradient */
      border-radius: 50%;
      opacity: 0;
      animation: sparkle 0.8s ease-out forwards; /* Sparkle animation */
    }
    .sparkles::before {
      width: 20px;
      height: 20px;
      top: -10px;
      left: 10%;
    }
    .sparkles::after {
      width: 15px;
      height: 15px;
      bottom: -10px;
      right: 15%;
    }
    @keyframes sparkle {
      0% { opacity: 0.8; transform: scale(0); }
      100% { opacity: 0; transform: scale(1.5); }
    }
    /* Animated icon (e.g., money bag) */
    .icon-anim {
      position: absolute;
      font-size: 2em;
      top: 10px;
      right: 20px;
      animation: spin 1s linear; /* Spin animation */
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    /* Falling coin animation */
    .coin {
      position: absolute;
      font-size: 1.5em;
      animation: fall 2s linear forwards; /* Fall animation */
      pointer-events: none; /* Do not block clicks */
    }
    @keyframes fall {
      0% { transform: translateY(-100px); opacity: 1; }
      100% { transform: translateY(300px); opacity: 0; }
    }
    /* Slot machine effect for result */
    .slot-machine {
      animation: slotSpin 1s ease-in-out; /* Slot spin animation */
      filter: blur(2px); /* Blur effect during spin */
    }
    @keyframes slotSpin {
      0% { transform: translateY(-20px); opacity: 0.5; }
      50% { transform: translateY(20px); opacity: 0.7; }
      100% { transform: translateY(0); opacity: 1; filter: blur(0); }
    }
    /* Particles bursting from the button */
    .button-particle {
      position: absolute;
      font-size: 1em;
      animation: particleBurst 0.8s ease-out forwards; /* Particle burst animation */
      pointer-events: none;
    }
    @keyframes particleBurst {
      0% { transform: translate(0, 0); opacity: 1; }
      100% { transform: translate(var(--x), var(--y)); opacity: 0; } /* Use CSS variables for random direction */
    }

    /* New: Floating currency symbol */
    .floating-currency {
        position: absolute;
        font-size: 2em;
        opacity: 0;
        animation: floatAndFade 2s ease-out forwards;
        pointer-events: none;
        z-index: 10; /* Ensure it's above other elements */
    }
    @keyframes floatAndFade {
        0% { transform: translateY(0) translateX(0); opacity: 1; }
        100% { transform: translateY(-100px) translateX(var(--float-x)); opacity: 0; }
    }

    /* Responsive adjustments for smaller screens */
    @media (max-width: 500px) {
      .container {
        padding: 20px; /* Reduce padding */
      }
      h2 {
        font-size: 1.6em; /* Smaller heading */
      }
      label, input, button {
        font-size: 1em; /* Smaller font for inputs and buttons */
      }
      #resultado {
        font-size: 1.3em; /* Smaller result font */
      }
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <h2>Calculadora Legendaria 💸</h2>
    <label for="valorBase">Ingresa el valor base (ej. 53600):</label>
    <input type="number" id="valorBase" value="53600">
    <button id="calculateButton" onclick="calcular()">Calcular</button>
    <div id="resultado"></div>
  </div>

  <!-- Script for confetti animation -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <!-- Script for Tone.js (for sound effects) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js"></script>

  <script>
    // Initialize Tone.js components globally or lazily to ensure audio context is ready
    let cashRegisterSynth;
    let noiseSynth; // Separate variable for the noise synth
    let isAudioContextStarted = false;

    // Function to start the Tone.js audio context on first user interaction
    async function startAudioContext() {
      if (!isAudioContextStarted) {
        try {
          await Tone.start();
          console.log('AudioContext started!');
          isAudioContextStarted = true;

          // Initialize the synth for the cash register sound
          cashRegisterSynth = new Tone.MetalSynth({
            frequency: 200,
            envelope: {
              attack: 0.001,
              decay: 0.2,
              release: 0.1
            },
            harmonicity: 3.1,
            modulationIndex: 23,
            resonance: 4000,
            octaves: 1.5,
            amplitude: 0.5 // Adjust volume
          });

          // Initialize the noise synth for the click feel
          noiseSynth = new Tone.NoiseSynth({
