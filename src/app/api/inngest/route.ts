import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  processRender,
  runFollowup,
  scoreLead,
  syncLeadToCrm,
  trialReminders,
  autoReviewRequests,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processRender, scoreLead, runFollowup, syncLeadToCrm, trialReminders, autoReviewRequests],
});
