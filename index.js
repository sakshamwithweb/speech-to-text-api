import express from 'express';
const app = express();
const port = process.env.PORT || 8000;
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.API_KEY;

app.use(express.json());







const step3 = async (apiKey, AUDIO_URL, langg) => {
    return new Promise(async (resolve, reject) => {
        try {
            const checkJobStatus = async (jobId) => {
                while (true) {
                    try {
                        const response = await fetch("https://api.myshell.ai/v1/async_job/get_info", {
                            headers: {
                                "accept": "*/*",
                                "accept-language": "en",
                                "authorization": `Bearer ${apiKey}`,
                                "content-type": "application/json",
                                "myshell-client-version": "v1.6.4",
                                "myshell-service-name": "organics-api",
                                "priority": "u=1, i",
                                "Referer": "https://app.myshell.ai/",
                                "Referrer-Policy": "strict-origin-when-cross-origin"
                            },
                            method: "POST",
                            body: JSON.stringify({ jobId: jobId })
                        });

                        const data = await response.json();

                        if (data.status === "JOB_STATUS_DONE") {
                            const raw = data.data.message.text;
                            const a = raw.replace("json", '').replace(/`/g, '');
                            const final = JSON.parse(a);
                            console.log(final.text);
                            resolve(final.text);
                            break;
                        } else {
                            console.log("Processing...");
                            await new Promise(res => setTimeout(res, 500));
                        }
                    } catch (error) {
                        console.error("Error in checkJobStatus:", error);
                        reject(error);
                        break;
                    }
                }
            };

            const res = await fetch("https://api.myshell.ai/v1/widget/chat/send_message", {
                headers: {
                    "accept": "application/json",
                    "accept-language": "en",
                    "authorization": `Bearer ${apiKey}`,
                    "content-type": "application/json",
                    "myshell-client-version": "v1.6.4",
                    "myshell-service-name": "organics-api",
                    "priority": "u=1, i",
                    "Referer": "https://app.myshell.ai/",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36",
                },
                body: JSON.stringify({
                    "widgetId": "1781991624332992512",
                    "conversation_scenario": 4,
                    "message": "",
                    "messageType": 1,
                    "componentInputMessage": JSON.stringify({
                        "voice_url": AUDIO_URL,
                        "chunk_length_s": 30,
                        "batch_size": 24,
                        "return_timestamps": false,
                        "diarize": false,
                        "language": langg
                    }),
                }),
                method: "POST"
            });

            if (res.ok) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let result = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    result += decoder.decode(value, { stream: true });
                }

                const lines = result.split("\n");
                for (const line of lines) {
                    if (line.includes("jobId")) {
                        const eventData = JSON.parse(line.split("data: ")[1]);
                        const jobId = eventData.message.asyncJobInfo.jobId;
                        await checkJobStatus(jobId);
                        return;
                    }
                }
                reject(new Error("jobId not found in the response"));
            } else {
                reject(new Error(`Error: ${res}`))
            }
        } catch (error) {
            console.error("Error in step3:", error);
            reject(error);
        }
    });
};



app.post('/submit', async (req, res) => {
    try {
        const { AUDIO_URL, language } = req.body;
        const result = await step3(apiKey, AUDIO_URL, language);
        res.status(200).json({ text: result });
    } catch (error) {
        console.error("Error in /submit:", error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
});



app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
