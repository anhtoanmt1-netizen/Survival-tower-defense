class_name MapId
extends RefCounted
## Định dạng: THEME-V<phiên bản thuật toán>-<kích thước>-<seed base32>
## Ví dụ:     FOREST-V1-100-A8F72K
## Phiên bản thuật toán nằm trong ID để bản đồ cũ vẫn tái tạo được sau khi cập nhật.

const ALPHABET := "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const SEED_CHARS := 6
const SEED_MASK := (1 << 30) - 1


static func make(theme: String, size: int, seed_value: int) -> String:
	return "%s-V%d-%d-%s" % [theme, MapGenerator.ALGO_VERSION, size, encode_seed(seed_value)]


static func random_id(theme: String, size: int) -> String:
	return make(theme, size, randi() & SEED_MASK)


static func encode_seed(s: int) -> String:
	s = s & SEED_MASK
	var out := ""
	for i in SEED_CHARS:
		out = ALPHABET[s & 31] + out
		s >>= 5
	return out


static func decode_seed(code: String) -> int:
	if code.length() != SEED_CHARS:
		return -1
	var v := 0
	for ch in code:
		var idx := ALPHABET.find(ch)
		if idx < 0:
			return -1
		v = (v << 5) | idx
	return v


## Trả về {ok, theme, version, size, seed}. ok=false nếu ID sai định dạng.
static func parse(id: String) -> Dictionary:
	var bad := {"ok": false}
	var parts := id.strip_edges().to_upper().split("-")
	if parts.size() != 4:
		return bad
	if not parts[1].begins_with("V") or not parts[1].substr(1).is_valid_int():
		return bad
	if not parts[2].is_valid_int():
		return bad
	var size := int(parts[2])
	if size < GameConfig.MIN_MAP_SIZE or size > GameConfig.MAX_MAP_SIZE:
		return bad
	var seed_v := decode_seed(parts[3])
	if seed_v < 0:
		return bad
	return {"ok": true, "theme": parts[0], "version": int(parts[1].substr(1)), "size": size, "seed": seed_v}
