<script setup lang="ts">
/*
 * 发布商品弹窗：填写商品信息、照片和交易地点。
 *
 * 数据边界（接口未接入前的约定）：
 *   - 文字草稿只存在内存里，弹窗关闭后保留、刷新页面清空；
 *   - 图片用 URL.createObjectURL 指向本地文件，"仅当前会话可见"，不模拟上传成功；
 *   - 预览是本地拼装出来的样子，不会发布任何内容。
 */
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'     // 单行输入框
import InputNumber from 'primevue/inputnumber' // 数字输入框
import Textarea from 'primevue/textarea'       // 多行输入框
import FileUpload from 'primevue/fileupload'   // 文件选择
import Message from 'primevue/message'         // 提示条
// 图标：加图 / 图钉 / 左右箭头（照片排序）/ 关闭 / 眼睛（预览）/ 垃圾桶（清空）
import { ImagePlus, MapPin, ChevronRight, ChevronLeft, X, Eye, Trash2 } from 'lucide-vue-next'
// 地点选择弹窗（本目录组件，相对路径引用）
import PlacePicker from './PlacePicker.vue'
// categories：商品分类列表；PlaceValue：地点数据类型
import { categories, type PlaceValue } from '@/data/market'
// interface：TS 的类型声明，编译后消失，只管"编译期对不对得上"
// 一张待上传照片：file 是原始 File，url 是指向它的本地 blob 链接（预览用）。
interface LocalPhoto { id: string; file: File; url: string }
// 一份商品草稿的字段。
interface Draft { title: string; content: string; price: number | null; category: string; condition: string; place: PlaceValue | null; photos: LocalPhoto[] }
const props = defineProps<{ visible: boolean }>()
// v-model:visible 的另一半事件
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
// 桥接弹窗开关
const shown = computed({ get: () => props.visible, set: value => emit('update:visible', value) })
// fresh 是工厂函数：每次调用返回一份全新草稿对象（避免共享引用）
const fresh = (): Draft => ({ title: '', content: '', price: null, category: '', condition: '', place: null, photos: [] })
// reactive：响应式商品草稿，弹窗关闭后仍保留直到刷新。
const draft = reactive<Draft>(fresh())
const conditions = ['全新', '几乎全新', '正常使用痕迹', '有瑕疵，详见描述']
// 四个弹窗开关 + 处理中标记（一行声明多个变量）
const pickerVisible = ref(false), previewVisible = ref(false), clearVisible = ref(false), processing = ref(false)
const filePicker = ref<any>(null), issue = ref(''), photoNote = ref('')
// 预览快照：提交校验通过后把草稿拍成"照片"存进来
const preview = ref<{ title: string; content: string; price: number; place: PlaceValue; photos: { id: string; url: string }[] } | null>(null)
let disposed = false   // 组件是否已卸载：卸载后异步回调不再动数据
// blob 链接用完必须手动释放，否则文件会一直占着内存直到刷新页面。
function revoke(photos: LocalPhoto[]) { photos.forEach(photo => URL.revokeObjectURL(photo.url)) }
// 用 <img> 真正解码一次，挡掉"改了扩展名的假图片"和截断文件；8 秒解码不出来按失败处理。
// 返回 Promise：成功 resolve、失败 reject——上层用 await 等结果
function validateImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()   // 常见的"用 Image 对象当图片校验器"技巧
    const timer = setTimeout(() => finish(false), 8000)   // 8 秒兜底
    // finish 统一收尾：清计时器、摘监听、按结果 resolve/reject
    function finish(valid: boolean) { clearTimeout(timer); image.onload = null; image.onerror = null; valid ? resolve() : reject(new Error('图片无法读取')) }
    // naturalWidth/Height：图片真实尺寸——能解码出来且 >0 才算有效图
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0)
    image.onerror = () => finish(false)
    image.src = url   // 设置 src 才开始加载
  })
}
// FileUpload 的 uploader 事件：把选中的文件逐张校验后收进草稿。
// 会跳过：格式不对（仅 JPEG/PNG/WebP）、超过 10MB、凑满 9 张、和已有照片同名同大小同修改时间（视为重复）。
async function addPhotos(event: { files: File | File[] }) {
  const target = draft   // 先固定当前草稿，循环中途切类型也不写错对象
  // 三元判断：传来的是数组就拷贝一份，不是就包成单元素数组
  const incoming = Array.isArray(event.files) ? [...event.files] : [event.files]
  processing.value = true; photoNote.value = ''
  let skipped = 0   // 计数被跳过的图片
  try {
    // for...of：逐个处理（每张要 await，必须串行）
    for (const file of incoming) {
      // PrimeVue 会为已选择图片创建对象 URL；这里单独管理草稿的生命周期。
      const temporary = (file as File & { objectURL?: string }).objectURL
      if (temporary) URL.revokeObjectURL(temporary)   // 先释放 PrimeVue 建的链接，统一自己管
      if (disposed) break   // 弹窗已卸载，别再干活
      // 超长条件：格式不在白名单 || 超过 10MB（10*1024*1024 字节）|| 已满 9 张 || 重复文件
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024 || target.photos.length >= 9 || target.photos.some(photo => photo.file.name === file.name && photo.file.size === file.size && photo.file.lastModified === file.lastModified)) { skipped++; continue }
      const url = URL.createObjectURL(file)   // 给文件生成本地 blob 链接（预览显示用）
      try {
        await validateImage(url)   // 真解码验证
        if (disposed) { URL.revokeObjectURL(url); break }
        // crypto.randomUUID()：浏览器生成的全局唯一 id，给 v-for 当 key
        target.photos.push({ id: crypto.randomUUID(), file, url })
      } catch { URL.revokeObjectURL(url); skipped++ }   // 验证失败也要释放链接
    }
    if (!disposed) photoNote.value = skipped ? '部分图片未加入：请检查格式、大小、重复文件和 9 张上限。' : '图片仅保留在当前会话中，尚未上传。'
  } finally { processing.value = false; filePicker.value?.clear() }   // 无论如何恢复按钮、清空选择器
}
// 删除一张照片：先释放 blob 链接，再从数组里移除
function removePhoto(index: number) { const photo = draft.photos[index]; if (!photo) return; URL.revokeObjectURL(photo.url); draft.photos.splice(index, 1) }
// 移动照片（换封面用）：splice 先取出再插回目标位置；边界外直接不动
function movePhoto(index: number, offset: number) { const photos = draft.photos; const to = index + offset; if (to < 0 || to >= photos.length) return; const [photo] = photos.splice(index, 1); if (photo) photos.splice(to, 0, photo) }
// 清空商品草稿：释放所有 blob → 换新草稿 → 关确认框清提示
function clearDraft() { revoke(draft.photos); Object.assign(draft, fresh()); clearVisible.value = false; issue.value = ''; photoNote.value = ''; preview.value = null }
// 提交前校验：按帖子类型逐项检查，第一处不通过就停，问题写在 issue 里给模板显示。
// 全部通过才把草稿快照进 preview，打开预览弹窗。
function previewPost() {
  issue.value = ''
  const value = draft
  // else if 链：一次只报第一个问题
  if (!value.photos.length) issue.value = '请至少添加一张照片。'
  else if (!value.title.trim()) issue.value = '请填写商品标题。'
  else if (!value.content.trim()) issue.value = '请说明物品状况。'
  // Number.isFinite：排除 NaN/Infinity；价格 0~999999
  else if (value.price === null || !Number.isFinite(value.price) || value.price < 0 || value.price > 999999) issue.value = '请填写有效价格；免费赠送可填 0。'
  else if (!value.category || !value.condition) issue.value = '请选择商品分类和成色。'
  else if (!value.place) issue.value = '请选择公共交接地点。'
  if (issue.value || !value.place) return
  // 组装预览快照：trim 文字；地点和坐标都拷贝防串改。
  preview.value = { title: value.title.trim(), content: value.content.trim(), price: value.price!, place: { ...value.place, position: [...value.place.position] }, photos: value.photos.map(photo => ({ id: photo.id, url: photo.url })) }
  previewVisible.value = true
}
// 弹窗关闭：把内层的三个子弹窗也一并关掉
watch(() => props.visible, visible => { if (!visible) { pickerVisible.value = false; previewVisible.value = false; clearVisible.value = false } })
// 卸载：标记 disposed 并释放所有本地图片链接。
 onBeforeUnmount(() => { disposed = true; revoke(draft.photos) })
</script>
<template>
  <!-- 主弹窗 -->
  <Dialog v-model:visible="shown" modal header="发布商品" :draggable="false" class="post-composer-dialog" :style="{ width: '46rem', maxWidth: 'calc(100vw - 2rem)' }">
    <!-- form 的 id="post-editor"：让底部页脚的提交按钮能用 form 属性远程关联它 -->
    <form id="post-editor" class="post-editor" @submit.prevent="previewPost">
      <div class="editor-intro"><p>发布一件商品，写清信息后等待合适的买家。</p><small>图片和草稿仅保留在当前会话，刷新后清空。</small></div>
      <!-- 照片区：aria-labelledby 把"照片/计数"标题关联给整个区域（无障碍） -->
      <section class="photos-field" aria-labelledby="photo-label"><div class="field-heading"><label id="photo-label">商品照片</label><small>{{ draft.photos.length }} / 9</small></div>
        <!-- TransitionGroup：列表增删/排序时的动画容器；tag="div" 指定实际渲染成 div；
             name="photo-list" 对应下方 .photo-list-* 动画类 -->
        <TransitionGroup name="photo-list" tag="div" class="photo-grid">
          <!-- v-for 带两个参数：(item, index)；:key 用照片唯一 id（排序动画的依据） -->
          <div v-for="(photo, index) in draft.photos" :key="photo.id" class="photo-tile"><img :src="photo.url" :alt="(index === 0 ? '封面：' : '照片：') + photo.file.name"><span v-if="index === 0" class="cover-label">封面</span><Button class="photo-remove" rounded severity="secondary" size="small" :aria-label="'删除第 ' + (index + 1) + ' 张照片'" :disabled="processing" @click="removePhoto(index)"><X :size="14" aria-hidden="true" /></Button><div class="photo-order"><Button text severity="secondary" :disabled="index === 0 || processing" :aria-label="'将第 ' + (index + 1) + ' 张照片前移'" @click="movePhoto(index, -1)"><ChevronLeft :size="15" aria-hidden="true" /></Button><Button text severity="secondary" :disabled="index === draft.photos.length - 1 || processing" :aria-label="'将第 ' + (index + 1) + ' 张照片后移'" @click="movePhoto(index, 1)"><ChevronRight :size="15" aria-hidden="true" /></Button></div></div>
        </TransitionGroup>
        <!-- FileUpload：mode="basic" 简化模式；customUpload 不用 PrimeVue 内置上传，走 @uploader；
             auto：选完文件立即触发；accept：文件选择器的格式过滤；
             :maxFileSize：10MB（10485760 字节）；chooseButtonProps：透传按钮外观属性；
             两个 invalid*Message：超限/格式错误时 PrimeVue 自动弹的文案 -->
        <FileUpload ref="filePicker" mode="basic" customUpload auto multiple accept="image/jpeg,image/png,image/webp" :maxFileSize="10485760" chooseLabel="添加照片" :chooseButtonProps="{ severity: 'secondary', outlined: true }" :disabled="processing || draft.photos.length >= 9" invalidFileSizeMessage="{0} 超过大小限制，单张最多 10MB。" invalidFileTypeMessage="{0} 格式不支持，请选择 JPEG、PNG 或 WebP。" @uploader="addPhotos"><template #chooseicon><ImagePlus :size="17" aria-hidden="true" /></template></FileUpload>
        <!-- role="status"：内容变化时读屏自动播报 -->
        <p class="field-hint" role="status">{{ processing ? '正在读取图片…' : photoNote || '支持 JPEG、PNG、WebP，单张不超过 10MB。前移照片可更换封面。' }}</p>
      </section>
<div class="editor-fields">
        <div class="editor-field"><label for="post-title">商品标题</label><InputText id="post-title" v-model="draft.title" maxlength="60" placeholder="商品名称、品牌与关键状态" fluid /><span class="field-count">{{ draft.title.length }} / 60</span></div>
        <div class="editor-field"><label for="post-content">物品描述</label><Textarea id="post-content" v-model="draft.content" maxlength="2000" rows="4" autoResize placeholder="写清成色、配件，以及需要说明的小问题。" fluid /></div>
        <div class="idle-fields"><div class="editor-field"><label for="post-price">价格（元）</label><InputNumber v-model="draft.price" inputId="post-price" :min="0" :max="999999" :maxFractionDigits="2" :useGrouping="false" placeholder="0 表示赠送" fluid /></div><div class="editor-field"><label for="post-category">分类</label><Select v-model="draft.category" inputId="post-category" :options="categories.slice(1)" placeholder="选择分类" fluid /></div><div class="editor-field"><label for="post-condition">成色</label><Select v-model="draft.condition" inputId="post-condition" :options="conditions" placeholder="选择成色" fluid /></div></div>
        <div class="editor-field"><span class="field-label">交易地点</span><Button unstyled class="location-field" @click="pickerVisible = true"><MapPin :size="20" aria-hidden="true" /><span><strong>{{ draft.place?.name || '添加公共交接地点' }}</strong><small>{{ draft.place?.address || '高德搜索与地图选点，确认后保存' }}</small></span><ChevronRight :size="18" aria-hidden="true" /></Button></div>
      </div>
      <Message v-if="issue" severity="error" :closable="false" size="small">{{ issue }}</Message>
      <Message severity="secondary" :closable="false" size="small">发布与上传接口尚未接入。预览不会上传照片，也不会发布帖子。</Message>
    </form>
    <!-- 页脚：#footer 插槽；"预览帖子"用 form="post-editor" 远程提交上面的表单 -->
    <template #footer><div class="composer-footer"><Button severity="secondary" text :disabled="processing" @click="clearVisible = true"><Trash2 :size="16" aria-hidden="true" /><span>清空当前草稿</span></Button><div><Button label="保留并关闭" severity="secondary" text @click="shown = false" /><Button type="submit" form="post-editor" class="ink-button" :disabled="processing"><Eye :size="16" aria-hidden="true" />预览帖子</Button></div></div></template>
  </Dialog>
  <!-- 地点选择弹窗：@select 的 $event 是 emit 抛出的地点对象，直接写进草稿 -->
  <PlacePicker v-model:visible="pickerVisible" :value="draft.place" @select="draft.place = $event" />
  <!-- 预览弹窗：只读展示快照，不发布 -->
  <Dialog v-model:visible="previewVisible" modal :draggable="false" header="帖子预览 · 未发布" :style="{ width: '38rem', maxWidth: 'calc(100vw - 2rem)' }"><article v-if="preview" class="post-preview"><div class="preview-photos"><img v-for="photo in preview.photos" :key="photo.id" :src="photo.url" alt="本地照片预览"></div><small>商品</small><h2>{{ preview.title }}</h2><strong class="preview-price">{{ preview.price === 0 ? '免费赠送' : '¥' + preview.price }}</strong><p>{{ preview.content }}</p><div class="preview-place"><MapPin :size="17" aria-hidden="true" /><span>{{ preview.place.name }}</span></div><Message severity="secondary" :closable="false" size="small">仅当前页面可见，未发布。</Message></article></Dialog>
  <!-- 清空确认弹窗：severity="danger" 红色危险按钮 -->
  <Dialog v-model:visible="clearVisible" modal header="清空当前草稿？" :draggable="false" :style="{ width: '24rem', maxWidth: 'calc(100vw - 2rem)' }"><p>将移除当前商品草稿的文字、照片和地点。</p><template #footer><Button label="保留草稿" severity="secondary" text @click="clearVisible = false" /><Button label="确认清空" severity="danger" @click="clearDraft" /></template></Dialog>
</template>
<style scoped>
/* 商品编辑器整体：flex 纵排，子块间距 24px。
 * .photo-grid：repeat(4,minmax(0,1fr)) 四等分列（minmax(0,1fr) 防内容把列撑破）；
 * .photo-list-*：TransitionGroup 的进出场动画类（缩放淡入，leave-active 摆 absolute
 *   让其余照片用 .photo-list-move 平滑补位）；
 * 底部 @media(600px)：手机改三列、页脚纵排；prefers-reduced-motion：关掉全部动画。 */
.post-editor{display:flex;flex-direction:column;gap:24px;font:14px/1.5 system-ui,sans-serif;color:var(--app-text)}.editor-intro p{margin:0 0 6px}.editor-intro small,.field-hint,.field-count{font-size:11px;color:var(--app-muted)} .editor-field label,.field-label,.field-heading label{font-size:13px;font-weight:550}.photos-field{display:flex;flex-direction:column;align-items:flex-start;gap:12px}.field-heading{display:flex;justify-content:space-between;align-items:center;width:100%}.field-heading small{font-size:11px;color:var(--app-muted)}.photo-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;gap:12px}.photo-grid:empty{display:none}.photo-tile{position:relative;aspect-ratio:1;background:var(--app-hover);border-radius:10px;overflow:hidden;border:1px solid var(--app-border)}.photo-tile>img{height:100%;width:100%;object-fit:cover}.cover-label{position:absolute;top:7px;left:7px;font-size:10px;background:var(--app-field);color:var(--app-text);padding:2px 6px;border-radius:4px}.photo-remove{position:absolute;top:5px;right:5px;width:28px;height:28px;padding:0}.photo-order{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;background:var(--app-field);color:var(--app-text)}.photo-order :deep(button){height:30px;width:40px;padding:0}.field-hint{margin:0}.editor-fields{display:flex;flex-direction:column;gap:20px}.editor-field{display:flex;flex-direction:column;gap:8px;min-width:0}.field-count{align-self:flex-end;margin-top:-4px}.idle-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.idle-fields .editor-field:last-child{grid-column:1/-1}.location-field{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid var(--app-border);border-radius:8px;padding:14px;background:var(--app-field);color:var(--app-text);font:inherit;cursor:pointer}.location-field>span{flex:1;min-width:0}.location-field strong{font-size:13px;font-weight:500}.location-field small{display:block;font-size:11px;color:var(--app-muted);margin-top:4px;overflow-wrap:anywhere}.location-field:focus-visible{outline:2px solid var(--app-text);outline-offset:2px}.composer-footer{display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px}.composer-footer>div{display:flex;gap:8px}.post-preview{font:14px/1.7 system-ui,sans-serif;color:var(--app-text)}.preview-photos{display:flex;gap:10px;overflow:auto;scroll-snap-type:x mandatory;margin-bottom:18px}.preview-photos img{width:100%;max-height:360px;object-fit:contain;flex:none;background:var(--app-hover);border-radius:8px;scroll-snap-align:start}.post-preview>small{color:var(--app-muted)}.post-preview h2{font-size:20px;margin:8px 0}.preview-price{font-size:24px}.post-preview>p{white-space:pre-wrap;overflow-wrap:anywhere}.preview-place{display:flex;gap:8px;align-items:center;margin:20px 0}.photo-list-move,.photo-list-enter-active,.photo-list-leave-active{transition:opacity .18s ease,transform .18s ease}.photo-list-enter-from,.photo-list-leave-to{opacity:0;transform:scale(.97)}.photo-list-leave-active{position:absolute}@media(max-width:600px){.photo-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.composer-footer{align-items:stretch;flex-direction:column}.composer-footer>div{justify-content:flex-end}.composer-footer>button{align-self:flex-start}.preview-photos img{max-height:300px}}@media(prefers-reduced-motion:reduce){.photo-list-move,.photo-list-enter-active,.photo-list-leave-active{transition:none}.photo-list-enter-from,.photo-list-leave-to{transform:none}}
</style>
