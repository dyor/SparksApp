import { BaseSpark } from "../types/spark";

// Import actual spark components
import React from "react";
import { BaseSpark as BaseSparkComponent } from "./BaseSpark";
import { IdeasSpark } from "../sparks/IdeasSpark";
import { Ideas2Spark } from "../sparks/Ideas2Spark";
import { SpinnerSpark } from "../sparks/SpinnerSpark";
import { FlashcardsSpark } from "../sparks/FlashcardsSpark";
import { PackingListSpark } from "../sparks/PackingListSpark";
import { TodoSpark } from "../sparks/TodoSpark";
import ToviewSpark from "../sparks/ToviewSpark";
import { FoodCamSpark } from "../sparks/FoodCamSpark";
import { SpanishFriendSpark } from "../sparks/SpanishFriendSpark";
import { TeeTimeTimerSpark } from "../sparks/TeeTimeTimerSpark";
import { SoundboardSpark } from "../sparks/SoundboardSpark";
import { GolfBrainSpark } from "../sparks/GolfBrainSpark";
import QuickConvertSpark from "../sparks/QuickConvertSpark";
import SpanishReaderSpark from "../sparks/SpanishReaderSpark";
import TripStorySpark from "../sparks/TripStorySpark";
import ShortSaverSpark from "../sparks/ShortSaverSpark";
import SongSaverSpark from "../sparks/SongSaverSpark";
import SparkSpark from "../sparks/SparkSpark";
import { MinuteMinderSpark } from "../sparks/MinuteMinderSpark";
import { BuzzyBingoSpark } from "../sparks/BuzzyBingoSpark";
import { CardScoreSpark } from "../sparks/CardScoreSpark";
import { GolfWisdomSpark } from "../sparks/GolfWisdomSpark";
import WeightTrackerSpark from "../sparks/WeightTrackerSpark";
import ShareSparks from "../sparks/ShareSparks";
import ComingUpSpark from "../sparks/ComingUpSpark";
import { FinalClockSpark } from "../sparks/FinalClockSpark";
import TripSurveySpark from "../sparks/TripSurveySpark";
import RecAIpeSpark from "../sparks/RecAIpeSpark";
import ShopSpark from "../sparks/ShopSpark";
import { SparkStatsSpark } from "../sparks/SparkStatsSpark";
import { BigDennySpark } from "../sparks/BigDennySpark";
import { SpeakSpark } from "../sparks/SpeakSpark";
import FriendSpark from "../sparks/FriendSpark";
import TripodSpark from "../sparks/TripodSpark";
import MemorySpark from "../sparks/MemorySpark";
import ScorecardSpark from "../sparks/ScorecardSpark";
import styled from "styled-components/native";

const PlaceholderContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const PlaceholderText = styled.Text`
  font-size: 18px;
  color: #666;
  text-align: center;
`;

const PlaceholderSpark: React.FC = () => (
  <BaseSparkComponent>
    <PlaceholderContainer>
      <PlaceholderText>This spark is under construction</PlaceholderText>
    </PlaceholderContainer>
  </BaseSparkComponent>
);

// Registry of all available sparks
export const sparkRegistry: Record<string, BaseSpark> = {
  ideas: {
    metadata: {
      id: "ideas",
      title: "Ideas",
      description: "Capture and organize your brilliant ideas",
      icon: "💡",
      category: "productivity",
      createdAt: "2025-12-10T00:00:00.000Z",
      rating: 4.5,
    },
    component: IdeasSpark,
  },
  ideas2: {
    metadata: {
      id: "ideas2",
      title: "Ideas 2",
      description: "Enhanced idea capture with formatting and search",
      icon: "💡",
      category: "productivity",
      createdAt: new Date().toISOString(),
      rating: 5.0,
    },
    component: Ideas2Spark,
  },
  spinner: {
    metadata: {
      id: "spinner",
      title: "Decision Spinner",
      description: "Make decisions with customizable spinning wheel",
      icon: "🎡",
      category: "utility",
      createdAt: "2024-01-01T00:00:00.000Z",
      rating: 4.2,
    },
    component: SpinnerSpark,
  },
  flashcards: {
    metadata: {
      id: "flashcards",
      title: "Spanish Cards",
      description: "Study with interactive flip cards and progress tracking",
      icon: "🃏",
      category: "spanish",
      createdAt: "2024-01-02T00:00:00.000Z",
      rating: 4.6,
    },
    component: FlashcardsSpark,
  },
  "packing-list": {
    metadata: {
      id: "packing-list",
      title: "Packing List",
      description: "Organize and track your travel or trip packing items",
      icon: "🎒",
      category: "productivity",
      createdAt: "2024-01-04T00:00:00.000Z",
      rating: 4.3,
    },
    component: PackingListSpark,
  },
  todo: {
    metadata: {
      id: "todo",
      title: "Todo List",
      description: "Organize tasks with due dates and completion tracking",
      icon: "📝",
      category: "productivity",
      createdAt: "2024-01-05T00:00:00.000Z",
      rating: 4.7,
    },
    component: TodoSpark,
  },
  toview: {
    metadata: {
      id: "toview",
      title: "Toview",
      description: "Track movies, books, and shows to watch with view dates",
      icon: "👁️",
      category: "media",
      createdAt: "2024-01-06T00:00:00.000Z",
      rating: 4.1,
    },
    component: ToviewSpark,
  },
  "food-cam": {
    metadata: {
      id: "food-cam",
      title: "FoodCam",
      description:
        "Visual food diary with photo timeline and camera integration",
      icon: "📸",
      category: "health",
      createdAt: "2024-01-07T00:00:00.000Z",
      rating: 4.4,
    },
    component: FoodCamSpark,
  },
  "spanish-friend": {
    metadata: {
      id: "spanish-friend",
      title: "Amigo",
      description: "Practice Spanish conversation with Ana and Miguel",
      icon: "🇪🇸",
      category: "spanish",
      createdAt: "2024-01-08T00:00:00.000Z",
      rating: 4.5,
    },
    component: SpanishFriendSpark,
  },
  "tee-time-timer": {
    metadata: {
      id: "tee-time-timer",
      title: "Tee Time Timer",
      description: "Nail your golf prep routine",
      icon: "⛳",
      category: "golf",
      createdAt: "2024-01-09T00:00:00.000Z",
      rating: 4.0,
    },
    component: TeeTimeTimerSpark,
  },
  soundboard: {
    metadata: {
      id: "soundboard",
      title: "Sound Board",
      description: "Record and play custom sound clips with categories",
      icon: "🎛️",
      category: "media",
      createdAt: "2024-01-10T00:00:00.000Z",
      rating: 3.8,
    },
    component: SoundboardSpark,
  },
  "golf-brain": {
    metadata: {
      id: "golf-brain",
      title: "Golf Brain",
      description:
        "Track golf rounds with detailed shot analysis and course management",
      icon: "🏌️‍♂️",
      category: "golf",
      createdAt: "2024-01-11T00:00:00.000Z",
      rating: 4.5,
    },
    component: GolfBrainSpark,
  },
  "quick-convert": {
    metadata: {
      id: "quick-convert",
      title: "Quick Convert",
      description:
        "Currency conversion tool with configurable exchange rates and denominations",
      icon: "💱",
      category: "utility",
      createdAt: "2024-01-12T00:00:00.000Z",
      rating: 3.9,
    },
    component: QuickConvertSpark,
  },
  "spanish-reader": {
    metadata: {
      id: "spanish-reader",
      title: "Spanish Reader",
      description:
        'Learn to read Spanish with interleaved English and Spanish text from "To Build a Fire"',
      icon: "📖",
      category: "spanish",
      createdAt: "2024-01-13T00:00:00.000Z",
      rating: 4.3,
    },
    component: SpanishReaderSpark,
  },
  "trip-story": {
    metadata: {
      id: "trip-story",
      title: "TripStory",
      description:
        "Plan, remember, and share your trip with pics...lots and lots of picsS",
      icon: "✈️",
      category: "travel",
      createdAt: "2024-01-14T00:00:00.000Z",
      rating: 4.8,
    },
    component: TripStorySpark,
  },
  "short-saver": {
    metadata: {
      id: "short-saver",
      title: "Short Saver",
      description: "Save and organize your favorite YouTubes",
      icon: "🎬",
      category: "media",
      createdAt: "2024-01-15T00:00:00.000Z",
      rating: 4.5,
    },
    component: ShortSaverSpark,
  },
  "song-saver": {
    metadata: {
      id: "song-saver",
      title: "Song Saver",
      description: "Save and organize your favorite Spotify tracks",
      icon: "🎵",
      category: "media",
      createdAt: "2024-11-21T00:00:00.000Z",
      rating: 4.5,
    },
    component: SongSaverSpark,
  },
  "spark-wizard": {
    metadata: {
      id: "spark-wizard",
      title: "Spark Wizard",
      description: "Submit your own Spark idea and become a product manager",
      icon: "🧙‍♂️",
      category: "community",
      createdAt: "2024-01-16T00:00:00.000Z",
      rating: 4.5,
    },
    component: SparkSpark,
  },
  "minute-minder": {
    metadata: {
      id: "minute-minder",
      title: "Minute Minder",
      description:
        "Track your daily activities with start times and countdown timers",
      icon: "⏳",
      category: "productivity",
      createdAt: "2024-01-17T00:00:00.000Z",
      rating: 4.0,
    },
    component: MinuteMinderSpark,
  },
  "buzzy-bingo": {
    metadata: {
      id: "buzzy-bingo",
      title: "Buzzy Bingo",
      description: "Buzzword bingo game - mark squares as you hear tech terms",
      icon: "🎯",
      category: "game",
      createdAt: "2025-11-01T00:00:00.000Z",
      rating: 4.5,
    },
    component: BuzzyBingoSpark as React.ComponentType<any>,
  },
  memory: {
    metadata: {
      id: "memory",
      title: "Memory",
      description: "Classic memory matching game with emoji cards",
      icon: "🧠",
      category: "game",
      createdAt: "2025-12-26T00:00:00.000Z",
      rating: 4.5,
    },
    component: MemorySpark,
  },
  "card-score": {
    metadata: {
      id: "card-score",
      title: "CardScore",
      description: "Fast, simple scorekeeping for card games",
      icon: "♠️",
      category: "utility",
      createdAt: "2025-11-01T00:00:00.000Z",
      rating: 4.0,
    },
    component: CardScoreSpark,
  },
  scorecard: {
    metadata: {
      id: "scorecard",
      title: "Scorecard",
      description: "Hole-by-hole round scoring with voice entry",
      icon: "⛳",
      category: "golf",
      createdAt: "2025-12-27T00:00:00.000Z",
      rating: 4.5,
    },
    component: ScorecardSpark,
  },
  golfWisdom: {
    metadata: {
      id: "golfWisdom",
      title: "Golf Wisdom",
      description: "Inspirational golf wisdom from Tam O'Shanter",
      icon: "📖",
      category: "golf",
      createdAt: "2025-12-01T00:00:00.000Z",
      rating: 4.3,
    },
    component: GolfWisdomSpark,
  },
  "weight-tracker": {
    metadata: {
      id: "weight-tracker",
      title: "Weight Tracker",
      description: "Track your weight, set goals, and visualize progress",
      icon: "⚖️",
      category: "health",
      createdAt: "2025-12-01T00:00:00.000Z",
      rating: 4.5,
    },
    component: WeightTrackerSpark,
  },
  "share-sparks": {
    metadata: {
      id: "share-sparks",
      title: "Share Sparks",
      description: "Share the Sparks app with friends",
      icon: "⚡️",
      category: "utility",
      createdAt: "2025-12-01T00:00:00.000Z",
      rating: 4.5,
    },
    component: ShareSparks,
  },
  "coming-up": {
    metadata: {
      id: "coming-up",
      title: "Coming Up",
      description: "Track upcoming birthdays, anniversaries, and big days",
      icon: "🗓️",
      category: "utility",
      createdAt: "2025-12-01T00:00:00.000Z",
      rating: 4.4,
    },
    component: ComingUpSpark,
  },
  "final-clock": {
    metadata: {
      id: "final-clock",
      title: "Final Clock",
      description:
        "Countdown to your projected death date based on actuarial data",
      icon: "☠️",
      category: "health",
      createdAt: "2025-12-02T00:00:00.000Z",
      rating: 4.5,
    },
    component: FinalClockSpark,
  },
  "trip-survey": {
    metadata: {
      id: "trip-survey",
      title: "Trip Survey",
      description:
        "Plan trips with group input and collaborative decision-making",
      icon: "🧭",
      category: "travel",
      createdAt: "2025-12-02T00:00:00.000Z",
      rating: 4.3,
    },
    component: TripSurveySpark,
  },
  "spark-stats": {
    metadata: {
      id: "spark-stats",
      title: "Spark Stats",
      description: "Community usage stats and trending sparks",
      icon: "📊",
      category: "community",
      createdAt: "2025-11-03T00:00:00.000Z",
      rating: 4.5,
    },
    component: SparkStatsSpark,
  },
  "big-denny": {
    metadata: {
      id: "big-denny",
      title: "Skins",
      description: "Track who wins holes on the course",
      icon: "⛳",
      category: "golf",
      createdAt: "2025-12-08T00:00:00.000Z",
      rating: 4.5,
    },
    component: BigDennySpark,
  },
  recaipe: {
    metadata: {
      id: "recaipe",
      title: "RecAIpe",
      description:
        "AI-powered recipe generator with shopping and cooking modes",
      icon: "🍳",
      category: "productivity",
      createdAt: "2025-12-06T00:00:00.000Z",
      rating: 4.6,
    },
    component: RecAIpeSpark,
  },
  shop: {
    metadata: {
      id: "shop",
      title: "Shop",
      description:
        "Simple shopping list with editable items and local persistence",
      icon: "🛒",
      category: "productivity",
      createdAt: "2025-12-14T00:00:00.000Z",
      rating: 4.6,
    },
    component: ShopSpark,
  },
  "speak-spark": {
    metadata: {
      id: "speak-spark",
      title: "Speak Spark",
      description: "Control other Sparks with your voice",
      icon: "🎙️",
      category: "productivity",
      createdAt: "2025-12-09T00:00:00.000Z",
      rating: 4.5,
    },
    component: SpeakSpark,
  },
  "friend-spark": {
    metadata: {
      id: "friend-spark",
      title: "Friend Spark",
      description: "Connect with friends and share sparks",
      icon: "🤝",
      category: "social",
      createdAt: "2025-12-15T00:00:00.000Z",
      rating: 4.5,
    },
    component: FriendSpark,
  },
  "tripod-spark": {
    metadata: {
      id: "tripod-spark",
      title: "The Wolverine",
      description: "Get the ultimate grass-mounting tripod for your swing",
      icon: "📸",
      iconImage: require("../../assets/wolverine_icon.png"),
      category: "golf",
      createdAt: "2025-12-22T00:00:00.000Z",
      rating: 4.4,
    },
    component: TripodSpark,
  },
};

export const getSparkById = (id: string): BaseSpark | undefined => {
  return sparkRegistry[id];
};

export const getAllSparks = (): BaseSpark[] => {
  return Object.values(sparkRegistry);
};
