import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  processRender,
  runFollowup,
  scoreLead,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processRender, scoreLead, runFollowup],
});
