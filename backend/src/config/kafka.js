const { Kafka } = require("kafkajs");
const enabled = Boolean(process.env.KAFKA_BROKERS);
let producer = null;
let ready = false;

const connectKafka = async () => {
  if (!enabled) return;
  try {
    const kafka = new Kafka({
      clientId: "pluma-backend",
      brokers: process.env.KAFKA_BROKERS.split(",").map(value => value.trim()).filter(Boolean),
      retry: { initialRetryTime: 100, retries: 1 },
    });
    producer = kafka.producer();
    await producer.connect();
    ready = true;
    console.log("Connected to Kafka producer");
  } catch (err) {
    ready = false;
    console.warn("Kafka unavailable; durable MongoDB flows remain active:", err.message);
  }
};

const emitEvent = async (topic, message) => {
  if (!ready || !producer) return false;
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    return true;
  } catch (err) {
    console.warn(`Failed to emit Kafka event to ${topic}:`, err.message);
    return false;
  }
};

// Initiate connection but don't block
connectKafka();

module.exports = { emitEvent };
