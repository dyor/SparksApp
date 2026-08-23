import { BaseSpark } from "../types/spark";

// Import actual spark components
import React from "react";
import { BaseSpark as BaseSparkComponent } from "./BaseSpark";
import { SpinnerSpark } from "../sparks/SpinnerSpark";
import { FlashcardsSpark } from "../sparks/FlashcardsSpark";
import { PackingListSpark } from "../sparks/PackingListSpark";
import { TodoSpark } from "../sparks/TodoSpark";
import ToviewSpark from "../sparks/ToviewSpark";
import { FoodCamSpark } from "../sparks/FoodCamSpark";
import { SpanishFriendSpark } from "../sparks/SpanishFriendSpark";
import { TeeTimeTimerSpark } from "../sparks/TeeTimeTimerSpark";
import { SoundboardSpark } from "../sparks/SoundboardSpark";
// import { GolfBrainSpark } from "../sparks/GolfBrainSpark";
import QuickConvertSpark from "../sparks/QuickConvertSpark";
import SpanishReaderSpark from "../sparks/SpanishReaderSpark";
import TripStorySpark from "../sparks/TripStorySpark";
import ShortSaverSpark from "../sparks/ShortSaverSpark";
import SongSaverSpark from "../sparks/SongSaverSpark";
import SparkSpark from "../sparks/SparkSpark";
import { MinuteMinderSpark } from "../sparks/MinuteMinderSpark";
import { Platform } from "react-native";
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
import { SkinsSpark } from "../sparks/SkinsSpark";
import { SpeakSpark } from "../sparks/SpeakSpark";
import FriendSpark from "../sparks/FriendSpark";
import TripodSpark from "../sparks/TripodSpark";
import MemorySpark from "../sparks/MemorySpark";
import { DreamCatcherSpark } from "../sparks/DreamCatcherSpark";
import { GoalTrackerSpark } from "../sparks/GoalTrackerSpark";
import { ScorecardSpark } from "../sparks/ScorecardSpark";
import { IdeasSpark } from "../sparks/IdeasSpark";
import BusinessSpark from "../sparks/BusinessSpark/BusinessSpark";
import { InfiniteSpark } from "../sparks/InfiniteSpark";
// import RecordSwingSpark from "../sparks/RecordSwingSpark";
// import VideoSpark from "../sparks/VideoSpark";
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

import { sparkMetadata } from "./sparkMetadata";

export const sparkRegistry: Record<string, BaseSpark> = {
  spinner: {
    metadata: sparkMetadata.spinner,
    component: SpinnerSpark,
  },
  flashcards: {
    metadata: sparkMetadata.flashcards,
    component: FlashcardsSpark,
  },
  "packing-list": {
    metadata: sparkMetadata["packing-list"],
    component: PackingListSpark,
  },
  todo: {
    metadata: sparkMetadata.todo,
    component: TodoSpark,
  },
  toview: {
    metadata: sparkMetadata.toview,
    component: ToviewSpark,
  },
  "food-cam": {
    metadata: sparkMetadata["food-cam"],
    component: FoodCamSpark,
  },
  "spanish-friend": {
    metadata: sparkMetadata["spanish-friend"],
    component: SpanishFriendSpark,
  },
  "tee-time-timer": {
    metadata: sparkMetadata["tee-time-timer"],
    component: TeeTimeTimerSpark,
  },
  soundboard: {
    metadata: sparkMetadata.soundboard,
    component: SoundboardSpark,
  },
  "quick-convert": {
    metadata: sparkMetadata["quick-convert"],
    component: QuickConvertSpark,
  },
  "spanish-reader": {
    metadata: sparkMetadata["spanish-reader"],
    component: SpanishReaderSpark,
  },
  "trip-story": {
    metadata: sparkMetadata["trip-story"],
    component: TripStorySpark,
  },
  "short-saver": {
    metadata: sparkMetadata["short-saver"],
    component: ShortSaverSpark,
  },
  "song-saver": {
    metadata: sparkMetadata["song-saver"],
    component: SongSaverSpark,
  },
  "spark-wizard": {
    metadata: sparkMetadata["spark-wizard"],
    component: SparkSpark,
  },
  "minute-minder": {
    metadata: sparkMetadata["minute-minder"],
    component: MinuteMinderSpark,
  },
  "buzzy-bingo": {
    metadata: sparkMetadata["buzzy-bingo"],
    component: BuzzyBingoSpark as React.ComponentType<any>,
  },
  memory: {
    metadata: sparkMetadata.memory,
    component: MemorySpark,
  },
  "card-score": {
    metadata: sparkMetadata["card-score"],
    component: CardScoreSpark,
  },
  golfWisdom: {
    metadata: sparkMetadata.golfWisdom,
    component: GolfWisdomSpark,
  },
  "weight-tracker": {
    metadata: sparkMetadata["weight-tracker"],
    component: WeightTrackerSpark,
  },
  "share-sparks": {
    metadata: sparkMetadata["share-sparks"],
    component: ShareSparks,
  },
  "coming-up": {
    metadata: sparkMetadata["coming-up"],
    component: ComingUpSpark,
  },
  "final-clock": {
    metadata: sparkMetadata["final-clock"],
    component: FinalClockSpark,
  },
  "trip-survey": {
    metadata: sparkMetadata["trip-survey"],
    component: TripSurveySpark,
  },
  "spark-stats": {
    metadata: sparkMetadata["spark-stats"],
    component: SparkStatsSpark,
  },
  skins: {
    metadata: sparkMetadata.skins,
    component: SkinsSpark,
  },
  recaipe: {
    metadata: sparkMetadata.recaipe,
    component: RecAIpeSpark,
  },
  shop: {
    metadata: sparkMetadata.shop,
    component: ShopSpark,
  },
  "speak-spark": {
    metadata: sparkMetadata["speak-spark"],
    component: SpeakSpark,
  },
  "friend-spark": {
    metadata: sparkMetadata["friend-spark"],
    component: FriendSpark,
  },
  "tripod-spark": {
    metadata: sparkMetadata["tripod-spark"],
    component: TripodSpark,
  },
  "dream-catcher": {
    metadata: sparkMetadata["dream-catcher"],
    component: DreamCatcherSpark,
  },
  "goal-tracker": {
    metadata: sparkMetadata["goal-tracker"],
    component: GoalTrackerSpark,
  },
  scorecard: {
    metadata: sparkMetadata.scorecard,
    component: ScorecardSpark,
  },
  ideas: {
    metadata: sparkMetadata.ideas,
    component: IdeasSpark,
  },
  "business-spark": {
    metadata: sparkMetadata["business-spark"],
    component: BusinessSpark,
  },
  infinite: {
    metadata: sparkMetadata.infinite,
    component: InfiniteSpark,
  },
  ...(Platform.OS !== 'android' ? {
    "golf-brain": {
      metadata: sparkMetadata["golf-brain"],
      component: require("../sparks/GolfBrainSpark").GolfBrainSpark,
    },
    "record-swing": {
      metadata: sparkMetadata["record-swing"],
      component: require("../sparks/RecordSwingSpark").default,
    },
    video: {
      metadata: sparkMetadata.video,
      component: require("../sparks/VideoSpark").default,
    }
  } : {}),
};

// Memoization cache for enhanced spark objects
const memoizedSparks: Record<string, BaseSpark> = {};

export const getSparkById = (id: string): BaseSpark | undefined => {
  if (memoizedSparks[id]) return memoizedSparks[id];

  const spark = sparkRegistry[id];
  if (!spark) return undefined;

  // Dynamically add beta suffix if it has the Beta property
  const isBeta = spark.metadata.properties?.includes("Beta");
  if (isBeta && !spark.metadata.title.toLowerCase().includes("beta")) {
    const enhancedSpark = {
      ...spark,
      metadata: {
        ...spark.metadata,
        title: `${spark.metadata.title} (beta)`
      }
    };
    memoizedSparks[id] = enhancedSpark;
    return enhancedSpark;
  }

  memoizedSparks[id] = spark;
  return spark;
};

export const getAllSparks = (): BaseSpark[] => {
  return Object.keys(sparkRegistry).map(id => getSparkById(id)!);
};
