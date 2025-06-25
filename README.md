# Voice Orb 🎙️

**Simple, modular voice-reactive animation for web apps.**

> 🎬 **[View Live Demo](https://hfarazul.github.io/voice_orb/examples/voice-reactive.html)** | **[Download Demo Video](1750876529446.mp4)**

## Quick Start

```html
<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
<script src="voice-orb-core.js"></script>

<lottie-player id="orb" src="1750876529446.json" style="width:300px;height:300px" loop></lottie-player>

<script>
const orb = new VoiceOrbCore();
orb.init('orb');
orb.play();
</script>
```

## Voice Reactive

```html
<script src="voice-orb-core.js"></script>
<script src="voice-orb-vad.js"></script>
<script src="voice-orb.js"></script>

<script>
const orb = new VoiceOrbAdvanced({ enableVAD: true });
await orb.init('orb');
await orb.connectMicrophone();
// Now responds to your voice automatically!
</script>
```

## Files

- `voice-orb-core.js` - Basic animation control (8KB)
- `voice-orb-vad.js` - Voice detection (6KB)
- `voice-orb.js` - Combined with legacy API (12KB)
- `examples/` - Working demos

## Examples

Start a local server:
```bash
python -m http.server 8080
```

Then open:
- `http://localhost:8080/examples/simple-integration.html`
- `http://localhost:8080/examples/voice-reactive.html`

## API

### Basic Control
```javascript
const orb = new VoiceOrbCore();
await orb.init('player-id');

orb.play();
orb.pause();
orb.setSpeed(1.5);
orb.setVoiceLevel(2.0);
```

### Voice Detection
```javascript
const orb = new VoiceOrbAdvanced({ enableVAD: true });
await orb.connectMicrophone();
orb.setVAD(true); // Enable/disable voice control
```

### Events
```javascript
orb.on('play', () => console.log('Started'));
orb.on('voiceStart', () => console.log('Voice detected'));
```

## React

```jsx
import { useEffect, useRef } from 'react';

function VoiceOrb() {
  const ref = useRef();

  useEffect(() => {
    const orb = new VoiceOrbCore();
    orb.init(ref.current);
    return () => orb.destroy();
  }, []);

  return <lottie-player ref={ref} src="animation.json" loop />;
}
```

## License

MIT
