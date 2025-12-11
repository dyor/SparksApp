import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSparkStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import styled from 'styled-components/native';

interface Idea {
    id: string;
    content: string;
    createdAt: string; // ISO string
}

const Container = styled.View`
  flex: 1;
  background-color: ${props => props.theme.colors.background};
  padding: 16px;
`;

const Header = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  margin-bottom: 16px;
  text-align: center;
`;

const InputContainer = styled.View`
  flex-direction: row;
  margin-bottom: 16px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  border-radius: 8px;
  padding: 12px;
  margin-right: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const AddButton = styled.TouchableOpacity`
  background-color: ${props => props.theme.colors.primary};
  justify-content: center;
  align-items: center;
  padding: 12px 20px;
  border-radius: 8px;
`;

const AddButtonText = styled.Text`
  color: white;
  font-weight: bold;
`;

const SearchContainer = styled.View`
  margin-bottom: 16px;
  background-color: ${props => props.theme.colors.surface};
  padding: 12px;
  border-radius: 8px;
`;

const SearchLabel = styled.Text`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
  margin-bottom: 4px;
`;

const IdeasList = styled.ScrollView`
  flex: 1;
`;

const IdeaCard = styled.View`
  background-color: ${props => props.theme.colors.surface};
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left-width: 4px;
  border-left-color: ${props => props.theme.colors.primary};
`;

const IdeaDate = styled.Text`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const IdeaText = styled.Text`
  font-size: 16px;
  color: ${props => props.theme.colors.text};
  line-height: 22px;
`;

const HighlightedText = styled.Text`
  text-decoration-line: underline;
  font-weight: bold;
  background-color: rgba(255, 255, 0, 0.2);
`;

export const IdeasSpark: React.FC = () => {
    const { getSparkData, setSparkData } = useSparkStore();
    const { colors } = useTheme();

    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [newIdea, setNewIdea] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Load ideas on mount
    useEffect(() => {
        const data = getSparkData('ideas');
        if (data && data.ideas) {
            setIdeas(data.ideas);
        }
    }, [getSparkData]);

    // Save ideas when changed
    useEffect(() => {
        const data = getSparkData('ideas');
        setSparkData('ideas', { ...data, ideas });
    }, [ideas, setSparkData, getSparkData]);

    const handleAddIdea = () => {
        if (!newIdea.trim()) return;

        const idea: Idea = {
            id: Date.now().toString(),
            content: newIdea.trim(),
            createdAt: new Date().toISOString(),
        };

        setIdeas([idea, ...ideas]); // Newest first
        setNewIdea('');
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString();
    };

    const renderContentWithHighlight = (content: string, keyword: string) => {
        if (!keyword) return <Text>{content}</Text>;

        const parts = content.split(new RegExp(`(${keyword})`, 'gi'));
        return (
            <Text>
                {parts.map((part, index) =>
                    part.toLowerCase() === keyword.toLowerCase() ? (
                        <HighlightedText key={index}>{part}</HighlightedText>
                    ) : (
                        <Text key={index}>{part}</Text>
                    )
                )}
            </Text>
        );
    };

    const filteredIdeas = ideas.filter(idea => {
        const matchKeyword = !searchKeyword || idea.content.toLowerCase().includes(searchKeyword.toLowerCase());

        // Simple date string comparison (YYYY-MM-DD)
        const ideaDate = idea.createdAt.split('T')[0];
        const afterStart = !startDate || ideaDate >= startDate;
        const beforeEnd = !endDate || ideaDate <= endDate;

        return matchKeyword && afterStart && beforeEnd;
    });

    return (
        <Container theme={{ colors }}>
            <Header theme={{ colors }}>Ideas 💡</Header>

            <InputContainer>
                <StyledInput
                    theme={{ colors }}
                    placeholder="New Idea..."
                    placeholderTextColor={colors.textSecondary}
                    value={newIdea}
                    onChangeText={setNewIdea}
                />
                <AddButton theme={{ colors }} onPress={handleAddIdea}>
                    <AddButtonText>Add</AddButtonText>
                </AddButton>
            </InputContainer>

            <SearchContainer theme={{ colors }}>
                <SearchLabel theme={{ colors }}>Search Keywords</SearchLabel>
                <StyledInput
                    theme={{ colors }}
                    placeholder="Search..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchKeyword}
                    onChangeText={setSearchKeyword}
                    style={{ marginBottom: 8 }}
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                        <SearchLabel theme={{ colors }}>Start Value (YYYY-MM-DD)</SearchLabel>
                        <StyledInput
                            theme={{ colors }}
                            placeholder="2024-01-01"
                            placeholderTextColor={colors.textSecondary}
                            value={startDate}
                            onChangeText={setStartDate}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <SearchLabel theme={{ colors }}>End Date (YYYY-MM-DD)</SearchLabel>
                        <StyledInput
                            theme={{ colors }}
                            placeholder="2024-12-31"
                            placeholderTextColor={colors.textSecondary}
                            value={endDate}
                            onChangeText={setEndDate}
                        />
                    </View>
                </View>
            </SearchContainer>

            <IdeasList>
                {filteredIdeas.map(idea => (
                    <IdeaCard key={idea.id} theme={{ colors }}>
                        <IdeaDate theme={{ colors }}>{formatDate(idea.createdAt)}</IdeaDate>
                        <IdeaText theme={{ colors }}>
                            {renderContentWithHighlight(idea.content, searchKeyword)}
                        </IdeaText>
                    </IdeaCard>
                ))}
                {filteredIdeas.length === 0 && (
                    <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>
                        No ideas found
                    </Text>
                )}
            </IdeasList>
        </Container>
    );
};

export default IdeasSpark;
