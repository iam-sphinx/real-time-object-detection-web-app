import Webcam from "react-webcam";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { runModelUtils } from "../utils";
import { Tensor } from "onnxruntime-web";

const WebcamComponent = (props: any) => {
  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const webcamRef = useRef<Webcam>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveDetection = useRef<boolean>(false);

  const [facingMode, setFacingMode] = useState<string>("environment");
  const originalSize = useRef<number[]>([0, 0]);

  const capture = () => {
    const canvas = videoCanvasRef.current!;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    })!;

    if (facingMode === "user") {
      context.setTransform(-1, 0, 0, 1, canvas.width, 0);
    }

    context.drawImage(
      webcamRef.current!.video!,
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (facingMode === "user") {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
    return context;
  };

  const runModel = async (ctx: CanvasRenderingContext2D) => {
    const data = props.preprocess(ctx);
    let outputTensor: Tensor;
    let inferenceTime: number;
    [outputTensor, inferenceTime] = await runModelUtils.runModel(
      props.session,
      data
    );

    props.postprocess(outputTensor, props.inferenceTime, ctx);
    setInferenceTime(inferenceTime);
  };

  const runLiveDetection = async () => {
    if (liveDetection.current) {
      liveDetection.current = false;
      return;
    }
    liveDetection.current = true;
    while (liveDetection.current) {
      const startTime = Date.now();
      const ctx = capture();
      if (!ctx) return;
      await runModel(ctx);
      setTotalTime(Date.now() - startTime);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    }
  };

  const processImage = async () => {
    reset();
    const ctx = capture();
    if (!ctx) return;

    // create a copy of the canvas
    const boxCtx = document
      .createElement("canvas")
      .getContext("2d") as CanvasRenderingContext2D;
    boxCtx.canvas.width = ctx.canvas.width;
    boxCtx.canvas.height = ctx.canvas.height;
    boxCtx.drawImage(ctx.canvas, 0, 0);

    await runModel(boxCtx);
    ctx.drawImage(boxCtx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const reset = async () => {
    var context = videoCanvasRef.current!.getContext("2d")!;
    context.clearRect(0, 0, originalSize.current[0], originalSize.current[1]);
    liveDetection.current = false;
  };

  const [SSR, setSSR] = useState<Boolean>(true);

  const setWebcamCanvasOverlaySize = () => {
    const element = webcamRef.current!.video!;
    if (!element) return;
    var w = element.offsetWidth;
    var h = element.offsetHeight;
    var cv = videoCanvasRef.current;
    if (!cv) return;
    cv.width = w;
    cv.height = h;
  };

  // close camera when browser tab is minimized
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        liveDetection.current = false;
      }
      // set SSR to true to prevent webcam from loading when tab is not active
      setSSR(document.hidden);
    };
    setSSR(document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  if (SSR) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-row flex-wrap  justify-evenly align-center w-full">
      <div
        id="webcam-container"
        className="flex items-center justify-center webcam-container"
      >
        <Webcam
          mirrored={facingMode === "user"}
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          imageSmoothing={true}
          videoConstraints={{
            facingMode: facingMode,
            // width: props.width,
            // height: props.height,
          }}
          onLoadedMetadata={() => {
            setWebcamCanvasOverlaySize();
            originalSize.current = [
              webcamRef.current!.video!.offsetWidth,
              webcamRef.current!.video!.offsetHeight,
            ] as number[];
          }}
          forceScreenshotSourceSize={true}
        />
        <canvas
          id="cv1"
          ref={videoCanvasRef}
          style={{
            position: "absolute",
            zIndex: 10,
            backgroundColor: "rgba(0,0,0,0)",
          }}
        ></canvas>
      </div>
      <div className="flex flex-col justify-center items-center">
        <div className="flex gap-1 flex-row flex-wrap justify-center items-center m-5">
          <div className="flex gap-3 justify-center items-center">
            {/* <button
              onClick={async () => {
                const startTime = Date.now();
                await processImage();
                setTotalTime(Date.now() - startTime);
              }}
              className="text-purple-700 hover:text-white border border-purple-700 hover:bg-purple-800 focus:ring-4 focus:outline-none focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-purple-400 dark:text-purple-400 dark:hover:text-white dark:hover:bg-purple-500 dark:focus:ring-purple-900"
            >
              Capture Photo
            </button> */}
            <button
              onClick={async () => {
                if (liveDetection.current) {
                  liveDetection.current = false;
                } else {
                  runLiveDetection();
                }
              }}
              //on hover, shift the button up
              className={`
              text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900 
              ${liveDetection.current ? "bg-white text-black" : ""}
              
              `}
            >
              Live Detection
            </button>
          </div>
          <div className="flex gap-3 ml-3 justify-center items-center">
            {/* <button
              onClick={() => {
                reset();
                setFacingMode(facingMode === "user" ? "environment" : "user");
              }}
              className="text-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:outline-none focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-yellow-300 dark:text-yellow-300 dark:hover:text-white dark:hover:bg-yellow-400 dark:focus:ring-yellow-900"
            >
              Switch Camera
            </button> */}
            {/* <button
              onClick={() => {
                reset();
                props.changeModelResolution();
              }}
              className="text-green-700 hover:text-white border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-green-500 dark:text-green-500 dark:hover:text-white dark:hover:bg-green-600 dark:focus:ring-green-800 "
            >
              Change Model
            </button> */}
            <button
              onClick={reset}
              className="text-gray-900 hover:text-white border border-gray-800 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-800"
            >
              Reset
            </button>
          </div>
        </div>
        {/* <div>Using {props.modelName}</div> */}
        <div className="flex gap-3 flex-row flex-wrap justify-between items-center px-5 w-full">
          {/* <div>
            {"Model Inference Time: " + inferenceTime.toFixed() + "ms"}
            <br />
            {"Total Time: " + totalTime.toFixed() + "ms"}
            <br />
            {"Overhead Time: +" + (totalTime - inferenceTime).toFixed(2) + "ms"}
          </div>
          <div>
            <div>
              {"Model FPS: " + (1000 / inferenceTime).toFixed(2) + "fps"}
            </div>
            <div>{"Total FPS: " + (1000 / totalTime).toFixed(2) + "fps"}</div>
            <div>
              {"Overhead FPS: " +
                (1000 * (1 / totalTime - 1 / inferenceTime)).toFixed(2) +
                "fps"}
            </div>
          </div>*/}
        </div>
      </div>
    </div>
  );
};

export default WebcamComponent;
