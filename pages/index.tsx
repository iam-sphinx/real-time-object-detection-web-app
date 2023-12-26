import Head from "next/head";
import Yolo from "../components/models/Yolo";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

export default function Home() {
  return (
    <>
      <main className="font-mono flex flex-col  items-center  min-h-screen bg-gradient-to-b from-black to-gray-600 text-white">
        <h1 className="m-5 text-xl font-bold">Real-Time Object Detection</h1>
        <Yolo />
      </main>
    </>
  );
}
