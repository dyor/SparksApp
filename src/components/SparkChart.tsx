import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Svg, Path, Circle, Line, Rect, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

export interface DataPoint {
  x: number | string; // X value or label
  y: number;          // Y value
  emoji?: string;     // Optional marker
  label?: string;     // Optional label for tooltip
  meta?: any;         // Extra info for tooltips
}

export interface ChartSeries {
  id: string;
  label: string;
  data: DataPoint[];
  color: string;
  style?: 'solid' | 'dashed';
  strokeWidth?: number;
}

export interface SparkChartProps {
  series: ChartSeries[];
  height?: number;
  padding?: number;
  showZeroLine?: boolean;
  showLegend?: boolean;
  showTooltips?: boolean;
  onPointPress?: (point: DataPoint, series: ChartSeries) => void;
}

export const SparkChart: React.FC<SparkChartProps> = ({
  series,
  height = 200,
  padding = 20,
  showZeroLine = false,
  showLegend = false,
  showTooltips = true,
  onPointPress,
}) => {
  const { colors } = useTheme();
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width * 0.95);
  const [selectedPoint, setSelectedPoint] = useState<{ point: DataPoint; series: ChartSeries; x: number; y: number } | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  // Calculate data range
  const { minVal, maxVal, maxPoints } = useMemo(() => {
    let min = 0;
    let max = 1;
    let maxP = 0;

    series.forEach(s => {
      s.data.forEach(p => {
        if (p.y < min) min = p.y;
        if (p.y > max) max = p.y;
      });
      if (s.data.length > maxP) maxP = s.data.length;
    });

    // Add some buffer to the top/bottom
    const range = max - min;
    max = max + range * 0.1;
    if (showZeroLine) {
      if (min > 0) min = 0;
      if (max < 0) max = 0;
    }

    return { minVal: min, maxVal: max, maxPoints: maxP };
  }, [series, showZeroLine]);

  const getX = (index: number, count: number) => {
    if (count <= 1) return padding + (chartWidth - 2 * padding) / 2;
    return padding + (index / (count - 1)) * (chartWidth - 2 * padding);
  };

  const getY = (value: number) => {
    const range = maxVal - minVal;
    if (range === 0) return height / 2;
    return height - padding - ((value - minVal) / range) * (height - 2 * padding);
  };

  const handlePress = (point: DataPoint, s: ChartSeries, x: number, y: number) => {
    setSelectedPoint({ point, series: s, x, y });
    onPointPress?.(point, s);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Svg width={chartWidth} height={height}>
        {/* X-Axis */}
        <Line 
          x1={padding} 
          y1={height - padding} 
          x2={chartWidth - padding} 
          y2={height - padding} 
          stroke={colors.border} 
          strokeWidth="1" 
        />
        
        {/* Y-Axis */}
        <Line 
          x1={padding} 
          y1={padding} 
          x2={padding} 
          y2={height - padding} 
          stroke={colors.border} 
          strokeWidth="1" 
        />

        {/* Zero Line */}
        {showZeroLine && minVal < 0 && (
          <Line
            x1={padding}
            y1={getY(0)}
            x2={chartWidth - padding}
            y2={getY(0)}
            stroke={colors.border}
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity={0.5}
          />
        )}

        {/* Lines and Points */}
        {series.map((s) => {
          const pathData = s.data.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${getX(i, s.data.length)} ${getY(p.y)}`
          ).join(' ');

          return (
            <G key={s.id}>
              {/* Path */}
              <Path
                d={pathData}
                stroke={s.color}
                strokeWidth={s.strokeWidth || 3}
                strokeDasharray={s.style === 'dashed' ? '4,4' : undefined}
                fill="none"
              />
              
              {/* Interactive Points */}
              {s.data.map((p, i) => {
                const x = getX(i, s.data.length);
                const y = getY(p.y);
                return (
                  <G key={`${s.id}-point-${i}`}>
                    {/* Visual Point */}
                    <Circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={s.color}
                    />
                    
                    {/* Emoji Marker */}
                    {p.emoji && (
                      <SvgText
                        x={x}
                        y={y - 10}
                        fontSize="16"
                        textAnchor="middle"
                      >
                        {p.emoji}
                      </SvgText>
                    )}

                    {/* Invisible Hit Area for Tapping */}
                    <Circle
                      cx={x}
                      cy={y}
                      r="15"
                      fill="transparent"
                      onPress={() => handlePress(p, s, x, y)}
                    />
                  </G>
                );
              })}
            </G>
          );
        })}

        {/* Tooltip */}
        {selectedPoint && showTooltips && (
          <G>
            <Rect
              x={Math.max(padding, Math.min(selectedPoint.x - 40, chartWidth - padding - 80))}
              y={selectedPoint.y - 45}
              width="80"
              height="35"
              rx="5"
              fill={colors.surface}
              stroke={selectedPoint.series.color}
              strokeWidth="1"
            />
            <SvgText
              x={Math.max(padding + 40, Math.min(selectedPoint.x, chartWidth - padding - 40))}
              y={selectedPoint.y - 23}
              fontSize="12"
              fontWeight="bold"
              fill={colors.text}
              textAnchor="middle"
            >
              {selectedPoint.point.label || selectedPoint.point.y}
            </SvgText>
            {/* Close tooltip on tap background */}
            <Rect
              x="0"
              y="0"
              width={chartWidth}
              height={height}
              fill="transparent"
              onPress={() => setSelectedPoint(null)}
            />
          </G>
        )}
      </Svg>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.id} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendLine, 
                  { 
                    backgroundColor: s.color,
                    height: s.style === 'dashed' ? 1 : 3,
                    borderStyle: s.style === 'dashed' ? 'dashed' : 'solid',
                    borderWidth: s.style === 'dashed' ? 1 : 0,
                    borderColor: s.color
                  } 
                ]} 
              />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLine: {
    width: 15,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
  },
});
