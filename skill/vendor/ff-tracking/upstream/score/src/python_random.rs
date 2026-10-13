//! Integer-seeded MT19937 with Python's getrandbits/rejection sampling.
//! Based on the public MT19937 algorithm and CPython's integer seed convention;
//! algorithm copyright and BSD notice: ../../licenses/MT19937.txt.
const N: usize = 624;
pub(crate) struct PythonRandom {
    state: [u32; N],
    position: usize,
}
impl PythonRandom {
    pub(crate) fn new(seed: u32) -> Self {
        let mut state = [0u32; N];
        state[0] = 19650218;
        for i in 1..N {
            state[i] = 1812433253u32
                .wrapping_mul(state[i - 1] ^ (state[i - 1] >> 30))
                .wrapping_add(i as u32);
        }
        let mut index = 1;
        // A positive 32-bit Python integer is a one-word init-key array.
        for _ in 0..N {
            state[index] = (state[index]
                ^ (state[index - 1] ^ (state[index - 1] >> 30)).wrapping_mul(1664525))
            .wrapping_add(seed);
            index += 1;
            if index == N {
                state[0] = state[N - 1];
                index = 1;
            }
        }
        for _ in 1..N {
            state[index] = (state[index]
                ^ (state[index - 1] ^ (state[index - 1] >> 30)).wrapping_mul(1566083941))
            .wrapping_sub(index as u32);
            index += 1;
            if index == N {
                state[0] = state[N - 1];
                index = 1;
            }
        }
        state[0] = 0x80000000;
        Self { state, position: N }
    }
    fn next_u32(&mut self) -> u32 {
        if self.position == N {
            for i in 0..N {
                let joined = (self.state[i] & 0x80000000) | (self.state[(i + 1) % N] & 0x7fffffff);
                self.state[i] = self.state[(i + 397) % N]
                    ^ (joined >> 1)
                    ^ if joined & 1 == 1 { 0x9908b0df } else { 0 };
            }
            self.position = 0;
        }
        let mut value = self.state[self.position];
        self.position += 1;
        value ^= value >> 11;
        value ^= (value << 7) & 0x9d2c5680;
        value ^= (value << 15) & 0xefc60000;
        value ^ (value >> 18)
    }
    /// Python randint(a,b) and choice(seq) both draw through _randbelow.
    pub(crate) fn below(&mut self, bound: u32) -> u32 {
        assert!(bound > 0);
        let bits = 32 - bound.leading_zeros();
        loop {
            let value = self.next_u32() >> (32 - bits);
            if value < bound {
                return value;
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::PythonRandom;
    #[test]
    fn matches_python_randint_and_choice() {
        let mut random = PythonRandom::new(4812);
        let expected = [
            72, 71, 100, 106, 97, 81, 104, 71, 86, 82, 103, 106, 80, 100, 110,
        ];
        assert_eq!(expected, std::array::from_fn(|_| 70 + random.below(41)));
        let mut random = PythonRandom::new(180);
        let expected = [
            2, 1, 10, 0, 9, 4, 1, 9, 8, 7, 3, 9, 0, 2, 1, 0, 10, 0, 2, 3, 1, 2,
        ];
        assert_eq!(expected, std::array::from_fn(|_| random.below(11)));
    }
}
