import React, { useState } from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import ProductShowcase from "./TripodSpark/ProductShowcase";
import ConfettiCannon from "react-native-confetti-cannon";

export default function TripodSpark() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ProductShowcase onAddToBag={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  addressPreview: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 32,
  },
  successImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
});
