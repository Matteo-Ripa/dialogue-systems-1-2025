import "./style.css";
//import typescriptLogo from "./typescript.svg";
//import viteLogo from "./vite.svg";
import { setupButton } from "./project.ts";

setupButton(document.querySelector<HTMLButtonElement>("#startButton")!);
