#pragma once
#include <vector>
#include <bitset>
#include <map>
#include <functional>
#include <string>
#include <format>

struct ChainLink {
    int fromCell;
    int toCell;
    int candidate;
    int toCand;
    bool isStrong;
};

class SudokuSolver {
public:
    static const char* tech_names[26];
private:
    std::vector<std::vector<int>> grid;
    std::vector<std::vector<std::bitset<10>>> candidates;
    std::map<int, int> tech_count;

public:
    explicit SudokuSolver(const std::string& input);
    void solve();
    void printResults() const;
    void printCandidates() const;  // Debug helper
private:
    enum Tech {
        BASIC_ELIM = 1, NAKED_SINGLE, HIDDEN_SINGLE, NAKED_PAIR, HIDDEN_PAIR,
        NAKED_TRIPLE, HIDDEN_TRIPLE, NAKED_QUAD, HIDDEN_QUAD, POINTING_PAIRS, BOX_LINE,
        X_WING, CHUTE_REMOTE_PAIR, SWORDFISH, Y_WING, RECTANGLE_ELIM, XYZ_WING, JELLYFISH, 
        SIMPLE_COLORING, X_CYCLE, SINGLE_COLORING, X_CHAIN, XY_CHAIN, DISCONTINUOUS_NICE_LOOP, CONTINUOUS_NICE_LOOP
    };

    // Group structure for unified iteration
    struct Group {
        std::vector<std::pair<int,int>> cells;
        Group() { cells.reserve(9); }
    };
    std::vector<Group> rows, cols, boxes;

    // Process all groups with a given function
    template<typename Func>
    bool processGroups(Func func) {
        bool changed = false;
        for (auto& group : rows) changed |= func(group);
        for (auto& group : cols) changed |= func(group);
        for (auto& group : boxes) changed |= func(group);
        return changed;
    }
    
    // Solving techniques
    bool eliminateBasic();
    bool checkNakedSingles();
    bool findHiddenSingles();
    bool findNakedSets(int size, Tech tech);
    bool findHiddenPairs();
    bool findHiddenTriples();
    bool findHiddenQuads();
    bool findIntersectionRemoval();
    
    // Wing techniques
    bool findXWing();
    bool findYWing();
    bool findXYZWing();

    // Fish techniques
    bool findFish(int size, Tech tech);
    bool findSwordfish();
    bool findJellyfish();

    // Rectangle techniques  
    bool findRectangleElimination();

    // Chute Remote Pairs techniques  
    bool findChuteRemotePairs();

    // Coloring techniques
    bool findSimpleColoring();
    bool findXCycles();
    bool findSingleColoring();
    bool testColoringHypothesis(int hr, int hc, int digit);
    bool hasContradiction(const std::vector<std::vector<int>>& gridCopy,
                         const std::vector<std::vector<std::bitset<10>>>& candidatesCopy,
                         int digit);

    // Chain techniques
    bool findXChain();
    bool findXYChain();

    // Helper methods for chains
    std::vector<ChainLink> findStrongLinks(int candidate);
    std::vector<ChainLink> findXYChainLinks();
    bool buildXChain(int startCell, int currentCell, int candidate, 
                    bool needStrong, std::vector<int>& chain,
                    std::bitset<81>& visited, 
                    const std::vector<ChainLink>& links);
    bool buildXYChain(int startCell, int startCandidate, 
                     int currentCell, int currentCandidate,
                     bool isWithinCell, int numLinks,
                     std::vector<int>& chain,
                     std::bitset<81>& visited,
                     const std::vector<ChainLink>& links);

    // Helper functions
    void setCell(int r, int c, int n);
    bool canSee(int r1, int c1, int r2, int c2) const;
    
public:
    // Getters for grid and candidates
    const std::vector<std::vector<int>>& getGrid() const { return grid; }
    const std::vector<std::vector<std::bitset<10>>>& getCandidates() const { return candidates; }
    const std::map<int, int>& getTechCount() const { return tech_count; }
};

// Independent validation function
bool isValid(const std::vector<std::vector<int>>& grid);
bool isFilled(const std::vector<std::vector<int>>& grid);