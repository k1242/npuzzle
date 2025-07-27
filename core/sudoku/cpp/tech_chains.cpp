#include "solver.h"
#include <algorithm>
#include <vector>
#include <bitset>

// Find strong links for a candidate within houses (row/col/box)
std::vector<ChainLink> SudokuSolver::findStrongLinks(int candidate) {
    std::vector<ChainLink> links;
    
    // Check rows
    for (int r = 0; r < 9; r++) {
        std::vector<int> positions;
        for (int c = 0; c < 9; c++) {
            if (grid[r][c] == 0 && candidates[r][c][candidate]) {
                positions.push_back(r * 9 + c);
            }
        }
        if (positions.size() == 2) {
            // Strong link found - toCand same as candidate for X-Chain
            links.push_back({positions[0], positions[1], candidate, candidate, true});
            links.push_back({positions[1], positions[0], candidate, candidate, true});
        }
    }
    
    // Check columns
    for (int c = 0; c < 9; c++) {
        std::vector<int> positions;
        for (int r = 0; r < 9; r++) {
            if (grid[r][c] == 0 && candidates[r][c][candidate]) {
                positions.push_back(r * 9 + c);
            }
        }
        if (positions.size() == 2) {
            // Strong link found
            links.push_back({positions[0], positions[1], candidate, candidate, true});
            links.push_back({positions[1], positions[0], candidate, candidate, true});
        }
    }
    
    // Check boxes
    for (int box = 0; box < 9; box++) {
        int br = (box / 3) * 3;
        int bc = (box % 3) * 3;
        std::vector<int> positions;
        
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                int r = br + i, c = bc + j;
                if (grid[r][c] == 0 && candidates[r][c][candidate]) {
                    positions.push_back(r * 9 + c);
                }
            }
        }
        
        if (positions.size() == 2) {
            // Strong link found - check if not already added from row/col
            bool alreadyAdded = false;
            int r0 = positions[0] / 9, c0 = positions[0] % 9;
            int r1 = positions[1] / 9, c1 = positions[1] % 9;
            
            if (r0 == r1 || c0 == c1) {
                alreadyAdded = true;  // Already added in row/col check
            }
            
            if (!alreadyAdded) {
                links.push_back({positions[0], positions[1], candidate, candidate, true});
                links.push_back({positions[1], positions[0], candidate, candidate, true});
            }
        }
    }
    
    // Add weak links (any cell that can see another with same candidate)
    for (int cell1 = 0; cell1 < 81; cell1++) {
        int r1 = cell1 / 9, c1 = cell1 % 9;
        if (grid[r1][c1] != 0 || !candidates[r1][c1][candidate]) continue;
        
        for (int cell2 = cell1 + 1; cell2 < 81; cell2++) {
            int r2 = cell2 / 9, c2 = cell2 % 9;
            if (grid[r2][c2] != 0 || !candidates[r2][c2][candidate]) continue;
            
            if (canSee(r1, c1, r2, c2)) {
                // Check if already have strong link
                bool hasStrong = false;
                for (const auto& link : links) {
                    if ((link.fromCell == cell1 && link.toCell == cell2) ||
                        (link.fromCell == cell2 && link.toCell == cell1)) {
                        hasStrong = true;
                        break;
                    }
                }
                
                if (!hasStrong) {
                    links.push_back({cell1, cell2, candidate, candidate, false});
                    links.push_back({cell2, cell1, candidate, candidate, false});
                }
            }
        }
    }
    
    return links;
}

// Build X-Chain recursively
bool SudokuSolver::buildXChain(int startCell, int currentCell, int candidate, 
                              bool needStrong, std::vector<int>& chain,
                              std::bitset<81>& visited, 
                              const std::vector<ChainLink>& links) {
    
    // Max chain length check (in links, not cells)
    if (chain.size() > 20) return false;
    
    // Check if we can complete the chain
    // Need at least 3 links (4 cells) and last link must be strong
    if (chain.size() >= 3 && !needStrong) {
        // Last link was strong, check for eliminations
        int r1 = startCell / 9, c1 = startCell % 9;
        int r2 = currentCell / 9, c2 = currentCell % 9;
        
        // Find cells that can see both ends
        bool found = false;
        for (int cell = 0; cell < 81; cell++) {
            int r = cell / 9, c = cell % 9;
            if (grid[r][c] == 0 && candidates[r][c][candidate] &&
                canSee(r, c, r1, c1) && canSee(r, c, r2, c2) &&
                cell != startCell && cell != currentCell) {
                
                // Check that this cell is not part of the chain
                bool inChain = false;
                for (int chainCell : chain) {
                    if (chainCell == cell) {
                        inChain = true;
                        break;
                    }
                }
                
                if (!inChain) {
                    candidates[r][c][candidate] = 0;
                    found = true;
                }
            }
        }
        
        if (found) {
            tech_count[X_CHAIN]++;
            return true;
        }
    }
    
    // Continue building chain
    for (const auto& link : links) {
        if (link.fromCell != currentCell || link.candidate != candidate) continue;
        if (needStrong && !link.isStrong) continue;
        if (visited[link.toCell]) continue;
        
        // Avoid immediate backtrack
        if (chain.size() >= 2 && link.toCell == chain[chain.size() - 2]) continue;
        
        chain.push_back(link.toCell);
        visited[link.toCell] = true;
        
        if (buildXChain(startCell, link.toCell, candidate, !needStrong, 
                       chain, visited, links)) {
            return true;
        }
        
        chain.pop_back();
        visited[link.toCell] = false;
    }
    
    return false;
}

bool SudokuSolver::findXChain() {
    bool changed = false;
    
    // Try each candidate
    for (int candidate = 1; candidate <= 9; candidate++) {
        auto links = findStrongLinks(candidate);
        
        // Try starting from each cell with this candidate
        for (int startCell = 0; startCell < 81; startCell++) {
            int r = startCell / 9, c = startCell % 9;
            if (grid[r][c] != 0 || !candidates[r][c][candidate]) continue;
            
            // Start chain with strong link from this cell
            for (const auto& link : links) {
                if (link.fromCell != startCell || !link.isStrong) continue;
                
                std::vector<int> chain = {startCell, link.toCell};
                std::bitset<81> visited;
                visited[startCell] = true;
                visited[link.toCell] = true;
                
                if (buildXChain(startCell, link.toCell, candidate, false, 
                               chain, visited, links)) {
                    changed = true;
                }
            }
        }
    }
    
    return changed;
}

// Find links for XY-Chain (bivalue cells)
std::vector<ChainLink> SudokuSolver::findXYChainLinks() {
    std::vector<ChainLink> links;
    
    // For each bivalue cell, add internal strong links
    for (int cell = 0; cell < 81; cell++) {
        int r = cell / 9, c = cell % 9;
        if (grid[r][c] != 0 || candidates[r][c].count() != 2) continue;
        
        std::vector<int> cellCands;
        for (int n = 1; n <= 9; n++) {
            if (candidates[r][c][n]) cellCands.push_back(n);
        }
        
        // Strong links within the cell (from one candidate to another)
        // From cand0 to cand1
        links.push_back({cell, cell, cellCands[0], cellCands[1], true});
        // From cand1 to cand0  
        links.push_back({cell, cell, cellCands[1], cellCands[0], true});
    }
    
    // Add weak links between bivalue cells that can see each other
    for (int cell1 = 0; cell1 < 81; cell1++) {
        int r1 = cell1 / 9, c1 = cell1 % 9;
        if (grid[r1][c1] != 0 || candidates[r1][c1].count() != 2) continue;
        
        for (int cell2 = cell1 + 1; cell2 < 81; cell2++) {
            int r2 = cell2 / 9, c2 = cell2 % 9;
            if (grid[r2][c2] != 0 || candidates[r2][c2].count() != 2) continue;
            
            if (!canSee(r1, c1, r2, c2)) continue;
            
            // Check for common candidates
            for (int n = 1; n <= 9; n++) {
                if (candidates[r1][c1][n] && candidates[r2][c2][n]) {
                    // Weak link on common candidate
                    links.push_back({cell1, cell2, n, n, false});
                    links.push_back({cell2, cell1, n, n, false});
                }
            }
        }
    }
    
    return links;
}

// Build XY-Chain recursively
bool SudokuSolver::buildXYChain(int startCell, int startCandidate, 
                               int currentCell, int currentCandidate,
                               bool isWithinCell, int numLinks,
                               std::vector<int>& chain,
                               std::bitset<81>& visited,
                               const std::vector<ChainLink>& links) {
    
    // Max chain length check
    if (numLinks > 20) return false;
    
    // Check if we can complete the chain
    // Need at least 3 links and ending with startCandidate in different cell
    if (numLinks >= 3 && currentCandidate == startCandidate && 
        currentCell != startCell && !isWithinCell) {
        
        int r1 = startCell / 9, c1 = startCell % 9;
        int r2 = currentCell / 9, c2 = currentCell % 9;
        
        // Find cells that can see both ends
        bool found = false;
        for (int cell = 0; cell < 81; cell++) {
            int r = cell / 9, c = cell % 9;
            if (grid[r][c] == 0 && candidates[r][c][startCandidate] &&
                canSee(r, c, r1, c1) && canSee(r, c, r2, c2) &&
                cell != startCell && cell != currentCell) {
                
                // Check that this cell is not part of the chain
                bool inChain = false;
                for (int chainCell : chain) {
                    if (chainCell == cell) {
                        inChain = true;
                        break;
                    }
                }
                
                if (!inChain) {
                    candidates[r][c][startCandidate] = 0;
                    found = true;
                }
            }
        }
        
        if (found) {
            tech_count[XY_CHAIN]++;
            return true;
        }
    }
    
    // Continue building chain
    for (const auto& link : links) {
        if (link.fromCell != currentCell || link.candidate != currentCandidate) continue;
        
        if (isWithinCell) {
            // Must be strong link within same cell
            if (!link.isStrong || link.toCell != currentCell) continue;
            
            // The toCand is the next candidate we'll work with
            if (buildXYChain(startCell, startCandidate, currentCell, link.toCand,
                           false, numLinks + 1, chain, visited, links)) {
                return true;
            }
        } else {
            // Must be weak link to another cell
            if (link.isStrong || link.toCell == currentCell) continue;
            if (visited[link.toCell]) continue;
            
            // Check that target is bivalue cell
            int tr = link.toCell / 9, tc = link.toCell % 9;
            if (candidates[tr][tc].count() != 2) continue;
            
            chain.push_back(link.toCell);
            visited[link.toCell] = true;
            
            // Next step will be within the new cell
            // Current candidate stays the same (we just moved to new cell)
            if (buildXYChain(startCell, startCandidate, link.toCell, currentCandidate,
                           true, numLinks + 1, chain, visited, links)) {
                return true;
            }
            
            chain.pop_back();
            visited[link.toCell] = false;
        }
    }
    
    return false;
}

bool SudokuSolver::findXYChain() {
    bool changed = false;
    auto links = findXYChainLinks();
    
    // Try starting from each bivalue cell
    for (int startCell = 0; startCell < 81; startCell++) {
        int r = startCell / 9, c = startCell % 9;
        if (grid[r][c] != 0 || candidates[r][c].count() != 2) continue;
        
        // Get both candidates in start cell
        std::vector<int> startCands;
        for (int n = 1; n <= 9; n++) {
            if (candidates[r][c][n]) startCands.push_back(n);
        }
        
        // Try starting with each candidate
        // First link is within the cell (from one candidate to another)
        for (int i = 0; i < 2; i++) {
            int startCand = startCands[i];
            std::vector<int> chain = {startCell};
            std::bitset<81> visited;
            visited[startCell] = true;
            
            // Start with internal transition in first cell
            if (buildXYChain(startCell, startCand, startCell, startCand,
                           true, 0, chain, visited, links)) {
                changed = true;
            }
        }
    }
    
    return changed;
}