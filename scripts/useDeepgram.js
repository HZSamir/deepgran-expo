import { LiveTranscriptionEvents, createClient } from "@deepgram/sdk";
import { Buffer } from "buffer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LiveAudioStream from "react-native-live-audio-stream";

const audioOptions = {
  sampleRate: 32000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  bufferSize: 4096,
  wavFile: "",
};

const useDeepgram = () => {
  const API_KEY = "YOUR_API_KEY";
  const [isRecording, setIsRecording] = useState(false);
  const client = useMemo(() => createClient(API_KEY), []);

  const keepAlive = useRef();
  const setupDeepgram = useCallback(() => {
    const deepgram = client.listen.live({
      // TODO: to use language as input
      language: "en-US",
      detect_language: true,
      interim_results: true,
      punctuate: true,
      model: "nova",
      smart_format: true,
    });

    if (keepAlive.current) clearInterval(keepAlive.current);
    keepAlive.current = setInterval(() => {
      console.log("deepgram: keepalive");
      deepgram.keepAlive();
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
      console.log("deepgram: connected");

      deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        console.log("deepgram: packet received");
        console.log("deepgram: transcript received", data);
      });

      deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive.current);
        deepgram.requestClose();
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
        console.log("deepgram: error received", error);
      });

      deepgram.addListener(LiveTranscriptionEvents.SpeechStarted, async () => {
        console.log("deepgram: speech started");
      });

      deepgram.addListener(LiveTranscriptionEvents.Unhandled, async () => {
        console.log("deepgram: unhandled");
      });

      deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
        console.log("deepgram: packet received");
        console.log("deepgram: metadata received", data);
      });
    });

    return deepgram;
  }, [client]);

  const deepgram = useMemo(setupDeepgram, [setupDeepgram]);
  useEffect(() => {
    return () => {
      deepgram.requestClose();
      deepgram.removeAllListeners();
    };
  }, [deepgram]);

  const onStart = useCallback(() => {
    deepgram.on(LiveTranscriptionEvents.Open, async () => {
      deepgram.on(LiveTranscriptionEvents.Transcript, (data) => {
        console.log("🚀 ~ deepgram.on ~ data:", data);
      });
      setIsRecording(true);
      LiveAudioStream.init(audioOptions);
      LiveAudioStream.on("data", (data) => {
        const chunk = Buffer.from(data, "base64");
        deepgram.send(chunk);
      });
      LiveAudioStream.start();
    });
  }, [deepgram]);

  const onStop = useCallback(() => {
    LiveAudioStream.stop();
    setIsRecording(false);
  }, []);

  return { onStart, onStop, isRecording };
};
export default useDeepgram;
