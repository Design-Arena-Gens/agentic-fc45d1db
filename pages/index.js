import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

export default function Stadium() {
  const [isChanting, setIsChanting] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const audioContextRef = useRef(null)
  const oscillatorsRef = useRef([])
  const gainNodeRef = useRef(null)
  const crowdNoiseRef = useRef(null)

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    gainNodeRef.current = audioContextRef.current.createGain()
    gainNodeRef.current.connect(audioContextRef.current.destination)

    return () => {
      stopChanting()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const createCrowdNoise = () => {
    const ctx = audioContextRef.current
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 300
    filter.Q.value = 0.5

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.3

    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(gainNodeRef.current)

    return { noise, filter, noiseGain }
  }

  const playChant = () => {
    const ctx = audioContextRef.current
    const now = ctx.currentTime

    const chantPattern = [
      { text: 'رو', freq: 440, duration: 0.3 },
      { text: 'نال', freq: 523, duration: 0.3 },
      { text: 'ڈو', freq: 587, duration: 0.4 },
      { text: ' ', freq: 0, duration: 0.2 },
      { text: 'رو', freq: 440, duration: 0.3 },
      { text: 'نال', freq: 523, duration: 0.3 },
      { text: 'ڈو', freq: 587, duration: 0.4 },
      { text: ' ', freq: 0, duration: 0.2 },
      { text: 'رو', freq: 440, duration: 0.3 },
      { text: 'نال', freq: 523, duration: 0.3 },
      { text: 'ڈو!', freq: 659, duration: 0.6 }
    ]

    let time = now

    chantPattern.forEach(({ freq, duration }) => {
      if (freq > 0) {
        const osc = ctx.createOscillator()
        const oscGain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.value = freq

        oscGain.gain.setValueAtTime(0, time)
        oscGain.gain.linearRampToValueAtTime(0.2, time + 0.05)
        oscGain.gain.linearRampToValueAtTime(0.15, time + duration - 0.05)
        oscGain.gain.linearRampToValueAtTime(0, time + duration)

        osc.connect(oscGain)
        oscGain.connect(gainNodeRef.current)

        osc.start(time)
        osc.stop(time + duration)

        oscillatorsRef.current.push(osc)
      }
      time += duration
    })

    return time - now
  }

  const startChanting = () => {
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    setIsChanting(true)

    crowdNoiseRef.current = createCrowdNoise()
    crowdNoiseRef.current.noise.start()

    const chant = () => {
      if (isChanting) return
      const duration = playChant()
      setTimeout(() => {
        if (isChanting !== false) chant()
      }, (duration + 1.5) * 1000)
    }

    chant()
  }

  const stopChanting = () => {
    setIsChanting(false)

    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop()
      } catch (e) {}
    })
    oscillatorsRef.current = []

    if (crowdNoiseRef.current) {
      try {
        crowdNoiseRef.current.noise.stop()
      } catch (e) {}
      crowdNoiseRef.current = null
    }
  }

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  useEffect(() => {
    if (isChanting) {
      const interval = setInterval(() => {
        playChant()
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [isChanting])

  return (
    <>
      <Head>
        <title>رونالڈو اسٹیڈیم | Ronaldo Stadium</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="container">
        <div className="stadium">
          <div className={`lights ${isChanting ? 'flashing' : ''}`}></div>

          <div className="field">
            <div className="center-circle"></div>
            <div className="penalty-box left"></div>
            <div className="penalty-box right"></div>
          </div>

          <div className={`crowd ${isChanting ? 'cheering' : ''}`}>
            {[...Array(50)].map((_, i) => (
              <div key={i} className="person" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40}%`,
                animationDelay: `${Math.random() * 2}s`
              }}></div>
            ))}
          </div>

          <div className="chant-text">
            {isChanting && (
              <h1 className="urdu-text">
                رونالڈو رونالڈو رونالڈو!
              </h1>
            )}
          </div>
        </div>

        <div className="controls">
          <button
            className={`chant-button ${isChanting ? 'active' : ''}`}
            onClick={isChanting ? stopChanting : startChanting}
          >
            {isChanting ? 'رکیں' : 'شروع کریں'}
          </button>

          <div className="volume-control">
            <label htmlFor="volume">آواز | Volume</label>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <style jsx>{`
          .container {
            min-height: 100vh;
            background: linear-gradient(to bottom, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: 'Noto Nastaliq Urdu', serif;
            direction: rtl;
          }

          .stadium {
            position: relative;
            width: 90%;
            max-width: 800px;
            height: 500px;
            background: linear-gradient(to bottom, #2d5016 0%, #1a3a0f 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          }

          .lights {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            background: radial-gradient(ellipse at top, rgba(255,255,255,0.1) 0%, transparent 70%);
            pointer-events: none;
          }

          .lights.flashing {
            animation: flash 2s infinite;
          }

          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          .field {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 70%;
            border: 3px solid rgba(255,255,255,0.3);
          }

          .center-circle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
          }

          .penalty-box {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 15%;
            height: 40%;
            border: 3px solid rgba(255,255,255,0.3);
          }

          .penalty-box.left {
            left: 0;
            border-left: none;
          }

          .penalty-box.right {
            right: 0;
            border-right: none;
          }

          .crowd {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
          }

          .person {
            position: absolute;
            width: 8px;
            height: 8px;
            background: #ff9800;
            border-radius: 50%;
            opacity: 0.6;
          }

          .crowd.cheering .person {
            animation: cheer 1s infinite;
          }

          @keyframes cheer {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.2); }
          }

          .chant-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            pointer-events: none;
          }

          .urdu-text {
            font-size: 4rem;
            color: #fff;
            text-shadow: 0 0 20px rgba(255,215,0,0.8),
                         0 0 40px rgba(255,215,0,0.5),
                         0 0 60px rgba(255,215,0,0.3);
            animation: pulse 2s infinite, glow 1s infinite alternate;
            margin: 0;
            font-weight: 700;
          }

          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }

          @keyframes glow {
            from { text-shadow: 0 0 20px rgba(255,215,0,0.8),
                                0 0 40px rgba(255,215,0,0.5),
                                0 0 60px rgba(255,215,0,0.3); }
            to { text-shadow: 0 0 30px rgba(255,215,0,1),
                              0 0 60px rgba(255,215,0,0.8),
                              0 0 90px rgba(255,215,0,0.5); }
          }

          .controls {
            margin-top: 40px;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: center;
          }

          .chant-button {
            padding: 20px 60px;
            font-size: 2rem;
            font-family: 'Noto Nastaliq Urdu', serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(102,126,234,0.4);
            transition: all 0.3s ease;
            font-weight: 700;
          }

          .chant-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(102,126,234,0.6);
          }

          .chant-button:active {
            transform: translateY(-1px);
          }

          .chant-button.active {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            animation: buttonPulse 1s infinite;
          }

          @keyframes buttonPulse {
            0%, 100% { box-shadow: 0 10px 30px rgba(245,87,108,0.4); }
            50% { box-shadow: 0 10px 40px rgba(245,87,108,0.8); }
          }

          .volume-control {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: center;
          }

          .volume-control label {
            color: #fff;
            font-size: 1.2rem;
            font-weight: 700;
          }

          .volume-control input[type="range"] {
            width: 200px;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
            outline: none;
            -webkit-appearance: none;
          }

          .volume-control input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            background: #667eea;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(102,126,234,0.5);
          }

          .volume-control input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: #667eea;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(102,126,234,0.5);
            border: none;
          }

          @media (max-width: 768px) {
            .urdu-text {
              font-size: 2rem;
            }

            .chant-button {
              padding: 15px 40px;
              font-size: 1.5rem;
            }

            .stadium {
              height: 400px;
            }
          }
        `}</style>

        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            overflow-x: hidden;
          }
        `}</style>
      </div>
    </>
  )
}
