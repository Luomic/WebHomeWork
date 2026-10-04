<script setup lang="ts">

import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'     // 单行输入框
import InputNumber from 'primevue/inputnumber' // 数字输入框
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'       // 多行输入框
import FileUpload from 'primevue/fileupload'   // 文件选择
import Message from 'primevue/message'         // 提示条
import { ImagePlus, MapPin, ChevronRight, ChevronLeft, X, Eye, Trash2 } from 'lucide-vue-next'
import PlacePicker from './PlacePicker.vue'
import { categories, type PlaceValue } from '@/data/market'
import type { GoodsRequest } from '@/types/goods/Goods'
import { createGoods, uploadGoodsImage } from '@/api/client'
interface LocalPhoto { id: string; file: File; url: string }
// 属于最初没有与后端联调的圣遗物
interface Draft { title: string; content: string; price: number | null; category: string | null; place: PlaceValue | null; photos: LocalPhoto[] }
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const shown = computed({ get: () => props.visible, set: value => emit('update:visible', value) })
const fresh = (): Draft => ({ title: '', content: '', price: null, category: '', place: null, photos: [] })
const draft = reactive<Draft>(fresh())
const pickerVisible = ref(false), previewVisible = ref(false), clearVisible = ref(false), processing = ref(false), publishing = ref(false)
const filePicker = ref<any>(null), issue = ref(''), photoNote = ref(''), publishError = ref('')
const publishResult = ref<{ msg: string; status: string } | null>(null)
const preview = ref<{
  goods: Omit<GoodsRequest, 'images'>
  local: { place: PlaceValue | null; photos: { id: string; url: string }[] }
} | null>(null)
let disposed = false   // 组件是否已卸载：卸载后异步回调不再动数据
// blob 链接用完必须手动释放，否则文件会一直占着内存直到刷新页面。
function revoke(photos: LocalPhoto[]) { photos.forEach(photo => URL.revokeObjectURL(photo.url)) }
// 用 <img> 真正解码一次，挡掉"改了扩展名的假图片"和截断文件；8 秒解码不出来按失败处理。
function validateImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()   // 常见的"用 Image 对象当图片校验器"技巧
    const timer = setTimeout(() => finish(false), 8000)
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
      if (disposed) break
      // 超长条件：格式不在白名单 || 超过 10MB（10*1024*1024 字节）|| 已满 9 张 || 重复文件
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024 || target.photos.length >= 9 || target.photos.some(photo => photo.file.name === file.name && photo.file.size === file.size && photo.file.lastModified === file.lastModified)) { skipped++; continue }
      const url = URL.createObjectURL(file)
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
function removePhoto(index: number) { const photo = draft.photos[index]; if (!photo) return; URL.revokeObjectURL(photo.url); draft.photos.splice(index, 1) }
function movePhoto(index: number, offset: number) { const photos = draft.photos; const to = index + offset; if (to < 0 || to >= photos.length) return; const [photo] = photos.splice(index, 1); if (photo) photos.splice(to, 0, photo) }
function clearDraft() { revoke(draft.photos); Object.assign(draft, fresh()); clearVisible.value = false; issue.value = ''; photoNote.value = ''; preview.value = null }
// 按接口字段校验文字；照片至少一张是当前本地预览的要求。
// 全部通过才把草稿快照进 preview，打开预览弹窗。
function previewPost() {
  issue.value = ''
  publishError.value = ''
  publishResult.value = null
  const value = draft
  // else if 链：一次只报第一个问题
  if (!value.photos.length) issue.value = '请至少添加一张照片用于本地预览。'
  else if (!value.title.trim()) issue.value = '请填写商品标题。'
  else if (value.title.length > 100) issue.value = '商品标题最多 100 个字符。'
  else if (value.content.length > 1000) issue.value = '物品描述最多 1000 个字符。'
  else if ((value.category?.length || 0) > 32) issue.value = '商品分类最多 32 个字符。'
  // 排除 NaN/Infinity；价格必须严格大于 0。
  else if (value.price === null || !Number.isFinite(value.price) || value.price <= 0) issue.value = '商品价格必须大于 0。'
  if (issue.value) return
  // 可选字段留空时省略；本地扩展信息单独保存，不拼入 description。
  preview.value = {
    goods: {
      title: value.title.trim(),
      price: value.price!,
      ...(value.content.trim() ? { description: value.content.trim() } : {}),
      ...(value.category?.trim() ? { category: value.category.trim() } : {}),
    },
    local: {
      place: value.place ? { ...value.place, position: [...value.place.position] } : null,
      photos: value.photos.map(photo => ({ id: photo.id, url: photo.url })),
    },
  }
  previewVisible.value = true
}
// 先上传全部图片，只有每张图片都成功后才创建商品，避免提交 blob 地址给服务端。
async function publishPost() {
  if (!preview.value || publishing.value || publishResult.value) return
  publishing.value = true
  publishError.value = ''
  try {
    const imageUrls: string[] = []
    for (const photo of draft.photos) {
      const uploaded = await uploadGoodsImage(photo.file)
      imageUrls.push(uploaded.url)
    }
    const result = await createGoods({ ...preview.value.goods, images: imageUrls })
    publishResult.value = {
      msg: result.msg,
      status: result.goods?.status || 'pending',
    }
    window.dispatchEvent(new Event('market:goods-updated'))
  } catch (error) {
    publishError.value = error instanceof Error ? error.message : '发布失败，请稍后重试。'
  } finally {
    publishing.value = false
  }
}
// 弹窗关闭：把内层的三个子弹窗也一并关掉
watch(() => props.visible, visible => { if (!visible) { pickerVisible.value = false; previewVisible.value = false; clearVisible.value = false } })
// 卸载：标记 disposed 并释放所有本地图片链接。
 onBeforeUnmount(() => { disposed = true; revoke(draft.photos) })
</script>
<template>
  <!-- 主弹窗 -->
  <Dialog v-model:visible="shown" modal header="发布商品" :draggable="false" :closable="!publishing" class="post-composer-dialog" :style="{ width: '46rem', maxWidth: 'calc(100vw - 2rem)' }">
    <form id="post-editor" class="post-editor" @submit.prevent="previewPost">
      <div class="editor-intro"><p>填写商品信息，查看发布前的本地预览。</p><small>图片和草稿仅保留在当前会话，刷新后清空。</small></div>
      <section class="photos-field" aria-labelledby="photo-label"><div class="field-heading"><label id="photo-label">商品照片</label><small>{{ draft.photos.length }} / 9</small></div>
        <!-- TransitionGroup：列表增删/排序时的动画容器；tag="div" 指定实际渲染成 div；
             name="photo-list" 对应下方 .photo-list-* 动画类 -->
        <TransitionGroup name="photo-list" tag="div" class="photo-grid">
          <!-- v-for 带两个参数：(item, index)；:key 用照片唯一 id（排序动画的依据） -->
          <div v-for="(photo, index) in draft.photos" :key="photo.id" class="photo-tile"><img :src="photo.url" :alt="(index === 0 ? '封面：' : '照片：') + photo.file.name"><span v-if="index === 0" class="cover-label">封面</span><Button class="photo-remove" rounded severity="secondary" size="small" :aria-label="'删除第 ' + (index + 1) + ' 张照片'" :disabled="processing" @click="removePhoto(index)"><X :size="14" aria-hidden="true" /></Button><div class="photo-order"><Button text severity="secondary" :disabled="index === 0 || processing" :aria-label="'将第 ' + (index + 1) + ' 张照片前移'" @click="movePhoto(index, -1)"><ChevronLeft :size="15" aria-hidden="true" /></Button><Button text severity="secondary" :disabled="index === draft.photos.length - 1 || processing" :aria-label="'将第 ' + (index + 1) + ' 张照片后移'" @click="movePhoto(index, 1)"><ChevronRight :size="15" aria-hidden="true" /></Button></div></div>
        </TransitionGroup>
        <FileUpload ref="filePicker" mode="basic" customUpload auto multiple accept="image/jpeg,image/png,image/webp" :maxFileSize="10485760" chooseLabel="添加照片" :chooseButtonProps="{ severity: 'secondary', outlined: true }" :disabled="processing || draft.photos.length >= 9" invalidFileSizeMessage="{0} 超过大小限制，单张最多 10MB。" invalidFileTypeMessage="{0} 格式不支持，请选择 JPEG、PNG 或 WebP。" @uploader="addPhotos"><template #chooseicon><ImagePlus :size="17" aria-hidden="true" /></template></FileUpload>
        <p class="field-hint" role="status">{{ processing ? '正在读取图片…' : photoNote || '支持 JPEG、PNG、WebP，单张不超过 10MB。前移照片可更换封面。' }}</p>
      </section>
      <div class="editor-fields">
        <div class="editor-field"><label for="post-title">商品标题</label><InputText id="post-title" v-model="draft.title" maxlength="100" placeholder="商品名称、品牌与关键状态" fluid /><span class="field-count">{{ draft.title.length }} / 100</span></div>
        <div class="editor-field"><label for="post-content">物品描述（选填）</label><Textarea id="post-content" v-model="draft.content" maxlength="1000" rows="4" autoResize placeholder="写清配件及需要说明的商品信息。" fluid /><span class="field-count">{{ draft.content.length }} / 1000</span></div>
        <div class="idle-fields"><div class="editor-field"><label for="post-price">价格（元）</label><InputNumber v-model="draft.price" inputId="post-price" :min="0.01" :maxFractionDigits="2" :useGrouping="false" placeholder="请输入大于 0 的价格" fluid /></div><div class="editor-field"><label for="post-category">分类（选填）</label><Select v-model="draft.category" inputId="post-category" :options="categories.slice(1)" showClear placeholder="选择分类" fluid /></div></div>
        <div class="editor-field"><span class="field-label">交易地点（本地选填）</span><Button unstyled class="location-field" @click="pickerVisible = true"><MapPin :size="20" aria-hidden="true" /><span><strong>{{ draft.place?.name || '添加公共交接地点' }}</strong><small>{{ draft.place?.address || '高德搜索与地图选点，仅保存到本地草稿' }}</small></span><ChevronRight :size="18" aria-hidden="true" /></Button></div>
      </div>
      <Message v-if="issue" severity="error" :closable="false" size="small">{{ issue }}</Message>
      <Message severity="secondary" :closable="false" size="small">发布时会先上传图片，再提交商品。交易地点不属于商品接口字段，仅保留在本地草稿中。</Message>
    </form>
    <template #footer><div class="composer-footer"><Button severity="secondary" text :disabled="processing || publishing" @click="clearVisible = true"><Trash2 :size="16" aria-hidden="true" /><span>清空当前草稿</span></Button><div><Button label="保留并关闭" severity="secondary" text :disabled="publishing" @click="shown = false" /><Button type="submit" form="post-editor" class="ink-button" :disabled="processing || publishing"><Eye :size="16" aria-hidden="true" />预览商品</Button></div></div></template>
  </Dialog>
  <!-- 地点选择弹窗：@select 的 $event 是 emit 抛出的地点对象，直接写进草稿 -->
  <PlacePicker v-model:visible="pickerVisible" :value="draft.place" @select="draft.place = $event" />
  <!-- 预览弹窗：只读展示快照，不发布 -->
  <Dialog v-model:visible="previewVisible" modal :draggable="false" :closable="!publishing" :header="publishResult ? '商品已提交' : '商品预览'" :style="{ width: '38rem', maxWidth: 'calc(100vw - 2rem)' }"><article v-if="preview" class="post-preview"><div class="preview-photos"><img v-for="photo in preview.local.photos" :key="photo.id" :src="photo.url" alt="商品照片预览"></div><small>{{ preview.goods.category || '商品' }}</small><h2>{{ preview.goods.title }}</h2><strong class="preview-price">{{ '¥' + preview.goods.price }}</strong><p v-if="preview.goods.description">{{ preview.goods.description }}</p><div v-if="preview.local.place" class="preview-place"><MapPin :size="17" aria-hidden="true" /><span>{{ preview.local.place.name }}（本地信息）</span></div><Message v-if="publishResult" severity="success" :closable="false" size="small">{{ publishResult.msg || '商品已由服务端接收。' }} 当前审核状态：{{ publishResult.status }}。</Message><Message v-else severity="secondary" :closable="false" size="small">确认发布后，图片会先上传到服务端；交易地点不属于商品接口字段。</Message><Message v-if="publishError" severity="error" :closable="false" size="small">{{ publishError }}</Message></article><template #footer><div class="composer-footer"><span></span><div><Button :label="publishResult ? '完成' : '返回编辑'" severity="secondary" text :disabled="publishing" @click="previewVisible = false" /><Button v-if="!publishResult" class="ink-button" :loading="publishing" :disabled="processing" @click="publishPost"><ImagePlus :size="16" aria-hidden="true" />上传图片并发布</Button></div></div></template></Dialog>
  <!-- 清空确认弹窗：severity="danger" 红色危险按钮 -->
  <Dialog v-model:visible="clearVisible" modal header="清空当前草稿？" :draggable="false" :style="{ width: '24rem', maxWidth: 'calc(100vw - 2rem)' }"><p>将移除当前商品草稿的文字、照片和地点。</p><template #footer><Button label="保留草稿" severity="secondary" text @click="clearVisible = false" /><Button label="确认清空" severity="danger" @click="clearDraft" /></template></Dialog>
</template>
<style scoped>
.post-editor{display:flex;flex-direction:column;gap:24px;font:14px/1.5 system-ui,sans-serif;color:var(--app-text)}.editor-intro p{margin:0 0 6px}.editor-intro small,.field-hint,.field-count{font-size:11px;color:var(--app-muted)} .editor-field label,.field-label,.field-heading label{font-size:13px;font-weight:550}.photos-field{display:flex;flex-direction:column;align-items:flex-start;gap:12px}.field-heading{display:flex;justify-content:space-between;align-items:center;width:100%}.field-heading small{font-size:11px;color:var(--app-muted)}.photo-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;gap:12px}.photo-grid:empty{display:none}.photo-tile{position:relative;aspect-ratio:1;background:var(--app-hover);border-radius:10px;overflow:hidden;border:1px solid var(--app-border)}.photo-tile>img{height:100%;width:100%;object-fit:cover}.cover-label{position:absolute;top:7px;left:7px;font-size:10px;background:var(--app-field);color:var(--app-text);padding:2px 6px;border-radius:4px}.photo-remove{position:absolute;top:5px;right:5px;width:28px;height:28px;padding:0}.photo-order{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;background:var(--app-field);color:var(--app-text)}.photo-order :deep(button){height:30px;width:40px;padding:0}.field-hint{margin:0}.editor-fields{display:flex;flex-direction:column;gap:20px}.editor-field{display:flex;flex-direction:column;gap:8px;min-width:0}.field-count{align-self:flex-end;margin-top:-4px}.idle-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.location-field{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid var(--app-border);border-radius:8px;padding:14px;background:var(--app-field);color:var(--app-text);font:inherit;cursor:pointer}.location-field>span{flex:1;min-width:0}.location-field strong{font-size:13px;font-weight:500}.location-field small{display:block;font-size:11px;color:var(--app-muted);margin-top:4px;overflow-wrap:anywhere}.location-field:focus-visible{outline:2px solid var(--app-text);outline-offset:2px}.composer-footer{display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px}.composer-footer>div{display:flex;gap:8px}.post-preview{font:14px/1.7 system-ui,sans-serif;color:var(--app-text)}.preview-photos{display:flex;gap:10px;overflow:auto;scroll-snap-type:x mandatory;margin-bottom:18px}.preview-photos img{width:100%;max-height:360px;object-fit:contain;flex:none;background:var(--app-hover);border-radius:8px;scroll-snap-align:start}.post-preview>small{color:var(--app-muted)}.post-preview h2{font-size:20px;margin:8px 0}.preview-price{font-size:24px}.post-preview>p{white-space:pre-wrap;overflow-wrap:anywhere}.preview-place{display:flex;gap:8px;align-items:center;margin:20px 0}.photo-list-move,.photo-list-enter-active,.photo-list-leave-active{transition:opacity .18s ease,transform .18s ease}.photo-list-enter-from,.photo-list-leave-to{opacity:0;transform:scale(.97)}.photo-list-leave-active{position:absolute}@media(max-width:600px){.photo-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.composer-footer{align-items:stretch;flex-direction:column}.composer-footer>div{justify-content:flex-end}.composer-footer>button{align-self:flex-start}.preview-photos img{max-height:300px}}@media(prefers-reduced-motion:reduce){.photo-list-move,.photo-list-enter-active,.photo-list-leave-active{transition:none}.photo-list-enter-from,.photo-list-leave-to{transform:none}}
</style>
